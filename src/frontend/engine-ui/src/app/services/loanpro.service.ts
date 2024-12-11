import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
    const apiPath = `/api/public/api/1/Users/Autopal.Search()`;
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
      map((response) => {
        if (response.data && response.data.length > 0) {
          return response.data[0] as LoanResponse;
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
          $expand: 'LoanSetup,LoanSettings,Payments',
        },
      })
      .pipe(
        map((response) => {
          if (response) {
            return response as LoanResponse;
          } else {
            throw new Error('Loan not found by systemId');
          }
        }),
        catchError((error) =>
          this.handleError(error, 'Error fetching by systemId'),
        ),
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
