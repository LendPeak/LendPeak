import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  Observable,
  throwError,
  forkJoin,
  expand,
  takeWhile,
  of,
  scan,
  EMPTY,
} from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { Connector } from '../models/connector.model';
import { environment } from '../../environments/environment';
import { LoanResponse } from '../models/loanpro.model';

@Injectable({
  providedIn: 'root',
})
export class LoanProService {
  private proxyUrl = `${environment.apiUrl}/proxy`;

  constructor(private http: HttpClient) {}

  /**
   * Imports one or more loans based on the search criteria.
   * - If searchType='displayId', retrieve by displayId.
   * - If searchType='systemId', retrieve a single loan by systemId.
   * - If searchType='systemIdRange', retrieve multiple loans by systemId range.
   */
  importLoan(
    connector: Connector,
    searchType: 'displayId' | 'systemId' | 'systemIdRange',
    searchValue: string,
    toSystemId?: string,
  ): Observable<LoanResponse | LoanResponse[]> {
    const headers = this.buildHeaders(connector);

    switch (searchType) {
      case 'displayId':
        return this.fetchByDisplayId(headers, searchValue);

      case 'systemId':
        return this.fetchBySystemId(headers, searchValue);

      case 'systemIdRange':
        if (!toSystemId) {
          return throwError('Missing "toSystemId" for systemIdRange search.');
        }
        return this.fetchBySystemIdRange(headers, searchValue, toSystemId);

      default:
        return throwError('Invalid search type');
    }
  }

  /**
   * Build common headers for the requests.
   */
  private buildHeaders(connector: Connector): HttpHeaders {
    const forwardHeaders = [
      'LendPeak-Autopal-Instance-Id',
      'LendPeak-Authorization',
    ];

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'LendPeak-target-domain': connector.credentials.apiUrl || '',
      'LendPeak-forward-headers': forwardHeaders.join(','),
      'LendPeak-Autopal-Instance-Id': connector.credentials.autopalId || '',
      'LendPeak-Authorization': `Bearer ${connector.credentials.apiToken || ''}`,
    });
  }

  /**
   * Fetch a loan by displayId using a POST query.
   */
  private fetchByDisplayId(
    headers: HttpHeaders,
    displayId: string,
  ): Observable<LoanResponse> {
    const apiPath = `/api/public/api/1/Loans/Autopal.Search()`;
    const fullProxyUrl = `${this.proxyUrl}${apiPath}`;

    const requestBody = {
      query: {
        bool: {
          must: {
            match: {
              displayId: displayId,
            },
          },
        },
      },
    };

    return this.http.post<any>(fullProxyUrl, requestBody, { headers }).pipe(
      switchMap((response) => {
        // d.results.[0].id is the systemId of the first result
        if (response.data && response.data.d.results.length > 0) {
          const systemId = response.data.d.results[0].id;
          return this.fetchBySystemId(headers, systemId);
        } else {
          throw new Error('Loan not found by displayId');
        }
      }),
      catchError((error) =>
        this.handleError(error, 'Error fetching by displayId'),
      ),
    );
  }

  private fetchBySystemId(
    headers: HttpHeaders,
    systemId: string,
  ): Observable<LoanResponse> {
    const apiPath = `/api/public/api/1/odata.svc/Loans(${encodeURIComponent(systemId)})`;
    const fullProxyUrl = `${this.proxyUrl}${apiPath}`;

    return this.http
      .get<any>(fullProxyUrl, {
        headers,
        params: {
          // Expand whichever fields you need
          $expand:
            'Payments,DueDateChanges,ScheduleRolls,Transactions,LoanSetup,LoanSettings,InterestAdjustments',
        },
      })
      .pipe(
        switchMap((response) => {
          if (!response) {
            throw new Error('Loan not found by systemId');
          }
          // This will handle the "paging" for each expanded property
          // that might have a `__next` link.
          return this.loadAllExpandedCollections(response, headers);
        }),
        map((completeResponse) => completeResponse as LoanResponse),
        catchError((error) =>
          this.handleError(error, 'Error fetching by systemId'),
        ),
      );
  }

  /**
   * Load the remaining pages for any expanded collections that include a `__next` link.
   */
  private loadAllExpandedCollections(
    response: any,
    headers: HttpHeaders,
  ): Observable<any> {
    // Adjust this array to any expanded fields you want to handle
    const expansionsNeedingPagination = [
      'Payments',
      'DueDateChanges',
      'ScheduleRolls',
      'Transactions',
      'InterestAdjustments',
    ];

    // We’ll collect Observables in here for each field that has a __next link
    const fetchObservables: Array<Observable<[string, any[]]>> = [];

    for (const field of expansionsNeedingPagination) {
      // e.g. response.d.Payments, response.d.Transactions, ...
      if (response?.d?.[field]?.__next) {
        fetchObservables.push(
          this.fetchAllPagesForExpandedField(response.d[field], headers).pipe(
            // We'll map the final array of items to a tuple: [ fieldName, completeItems[] ]
            map((allItems) => [field, allItems] as [string, any[]]),
          ),
        );
      }
    }

    if (fetchObservables.length === 0) {
      // Nothing to paginate, return as-is
      return of(response);
    }

    // If we have multiple expansions that need paging, run them in parallel (forkJoin):
    return forkJoin(fetchObservables).pipe(
      map((results) => {
        // results is an array of [fieldName, completeItems[]]
        for (const [fieldName, completeItems] of results) {
          // Overwrite the partial "results" array with the fully loaded array
          response.d[fieldName].results = completeItems;
          // Remove the __next property so it doesn’t confuse your code
          delete response.d[fieldName].__next;
        }
        return response;
      }),
    );
  }

  /**
   * Given a partial data object (e.g. `response.d.Transactions`),
   * fetch all subsequent pages by following __next links.
   * Returns an Observable of the *complete* array of items.
   */
  private fetchAllPagesForExpandedField(
    initialData: { results: any[]; __next?: string; d?: { __next?: string } },
    headers: HttpHeaders,
  ): Observable<any[]> {
    return of(initialData).pipe(
      expand((currentChunk) => {
        // The next link might be either currentChunk.__next or currentChunk.d?.__next
        // so unify them:
        const nextLink = currentChunk.__next || currentChunk.d?.__next;
        if (!nextLink) {
          return EMPTY; // no more pages
        }

        // If the link is fully qualified, or partial, do your domain replacement logic
        const url = new URL(nextLink);
        const domain = url.origin;
        const nextUrl = nextLink.startsWith('http')
          ? nextLink.replace(domain, this.proxyUrl)
          : this.proxyUrl + nextLink;

        return this.http.get<any>(nextUrl, { headers });
      }),
      scan((acc, page) => {
        // For each chunk, unify the shape:
        // If it’s the initial chunk, it might have .results.
        // Subsequent pages might have .d.results
        const newItems = page.results ?? page.d?.results ?? [];
        const newNext = page.__next ?? page.d?.__next ?? null;

        // combine them into our accumulator
        acc.results = acc.results.concat(newItems);
        acc.__next = newNext;
        return acc;
      }),
      takeWhile((data) => !!data.__next, true),
      map((acc) => acc.results),
    );
  }

  /**
   * Fetch multiple loans for a range of systemIds, e.g., fromSystemId to toSystemId.
   * This performs multiple GET requests in parallel using forkJoin.
   */
  private fetchBySystemIdRange(
    headers: HttpHeaders,
    fromSystemId: string,
    toSystemId: string,
  ): Observable<LoanResponse[]> {
    const start = parseInt(fromSystemId, 10);
    const end = parseInt(toSystemId, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      return throwError('Invalid systemId range');
    }

    // Create an array of observables for each systemId in the range
    const requests: Observable<LoanResponse>[] = [];
    for (let id = start; id <= end; id++) {
      requests.push(this.fetchBySystemId(headers, id.toString()));
    }

    // Use forkJoin to execute them in parallel and wait for all
    return forkJoin(requests).pipe(
      map((responses) => {
        // responses is an array of LoanResponse
        return responses;
      }),
      catchError((error) =>
        // If any request fails, decide the behavior:
        // either return partial success or fail entirely.
        // Here we choose to fail entirely.
        this.handleError(error, 'Error fetching systemId range'),
      ),
    );
  }

  /**
   * Handle HTTP errors by logging and rethrowing them.
   */
  private handleError(error: any, context: string): Observable<never> {
    console.error(`${context}:`, error);
    return throwError(error);
  }
}
