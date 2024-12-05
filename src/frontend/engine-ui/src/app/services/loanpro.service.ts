import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
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

  importLoan(
    connector: Connector,
    searchType: 'displayId' | 'systemId',
    searchValue: string,
  ): Observable<LoanResponse> {
    const apiPath = '/api/public/api/1/Users/Autopal.Search()';
    const fullProxyUrl = `${this.proxyUrl}${apiPath}`;

    // Headers to forward
    const forwardHeaders = ['Autopal-Instance-Id', 'Authorization'];

    // Set up headers
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-target-domain': connector.credentials.apiUrl || '',
      'x-forward-headers': forwardHeaders.join(','),
      'Autopal-Instance-Id': connector.credentials.autopalId || '',
      Authorization: `Bearer ${connector.credentials.apiToken || ''}`,
    });

    // Construct the request body
    let requestBody: any;

    if (searchType === 'displayId') {
      requestBody = {
        query: {
          bool: {
            must: {
              match: {
                //displayId: searchValue.replace(/[\[\]]/g, '\\$&'),
                displayId: searchValue,
              },
            },
          },
        },
      };

      // Send the POST request via the proxy
      return this.http.post<any>(fullProxyUrl, requestBody, { headers }).pipe(
        map((response) => {
          // Check if response contains data
          if (response.data && response.data.length > 0) {
            const loan = response.data[0];
            return loan;
          } else {
            throw new Error('Loan not found');
          }
        }),
        catchError((error) => {
          // Handle errors
          console.error('Error importing loan:', error);
          return throwError(error);
        }),
      );
    } else if (searchType === 'systemId') {
      // Use odata.svc endpoint with GET request
      const apiPath = `/api/public/api/1/odata.svc/Loans(${encodeURIComponent(
        searchValue,
      )})`;
      const fullProxyUrl = `${this.proxyUrl}${apiPath}`;

      // Send the GET request via the proxy
      return this.http
        .get<any>(fullProxyUrl, {
          headers,
          params: {
            $expand: 'LoanSetup,LoanSettings,Payments',
          },
        })
        .pipe(
          map((response) => {
            // Process the response to get loan data
            if (response) {
              const loan = response as LoanResponse;
              return loan;
            } else {
              throw new Error('Loan not found');
            }
          }),
          catchError((error) => {
            // Handle errors
            console.error('Error importing loan:', error);
            return throwError(error);
          }),
        );
    } else {
      // Handle invalid searchType
      return throwError('Invalid search type');
    }
  }
}
