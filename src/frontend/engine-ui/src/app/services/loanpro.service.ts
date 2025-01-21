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

  /**
   * Fetch a single loan by systemId using a GET request.
   */
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
          $expand:
            'LoanSetup,LoanSettings,Payments,DueDateChanges,ScheduleRolls,Transactions',
        },
      })
      .pipe(
        switchMap((response) => {
          if (!response) {
            throw new Error('Loan not found by systemId');
          }
          // handle pagination in expanded collections
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
    const expansionsNeedingPagination = [
      'Payments',
      'DueDateChanges',
      'ScheduleRolls',
      'Transactions',
    ];

    const fetchObservables: Observable<[string, any[]]>[] = [];

    for (const field of expansionsNeedingPagination) {
      if (response[field]?.__next) {
        // We have a partial collection with `__next`; fetch the rest
        fetchObservables.push(
          this.fetchAllPagesForExpandedField(response[field], headers).pipe(
            map((allResults) => [field, allResults] as [string, any[]]),
          ),
        );
      }
    }

    if (fetchObservables.length === 0) {
      return of(response);
    }

    return forkJoin(fetchObservables).pipe(
      map((results) => {
        for (const [fieldName, completeResults] of results) {
          response[fieldName].results = completeResults;
          delete response[fieldName].__next;
        }
        return response;
      }),
    );
  }

  /**
   * Given the partial data for one expanded collection, fetch all subsequent pages
   * by following `__next` links. Returns an Observable of the complete array of items.
   */
  private fetchAllPagesForExpandedField(
    initialData: { results: any[]; __next?: string },
    headers: HttpHeaders,
  ): Observable<any[]> {
    return of(initialData).pipe(
      expand((currentPage) => {
        if (!currentPage.__next) {
          return EMPTY;
        }
        // If __next is a relative path, prepend `this.proxyUrl`. Adjust as needed.
        const nextUrl = currentPage.__next.startsWith('http')
          ? currentPage.__next
          : this.proxyUrl + currentPage.__next;

        return this.http.get<{ results: any[]; __next?: string }>(nextUrl, {
          headers,
        });
      }),
      scan((acc, pageData) => {
        acc.results = acc.results.concat(pageData.results);
        acc.__next = pageData.__next;
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
