import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Connector } from '../models/connector.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class XaiSummarizeService {
  // Example: If your backend is at environment.apiUrl, e.g., "https://backend-service.lendpeak.io"
  // then your summarization endpoint might be "/xai/summarizeLoanChanges"
  private summarizeUrl = `${environment.apiUrl}/xai/summarizeLoanChanges`;

  constructor(private http: HttpClient) {}

  /**
   * Summarizes loan changes by calling the XAI endpoint.
   * @param connector: For building headers (if your backend needs them).
   * @param changes: An object describing which loan parameters changed.
   * @returns Observable that emits a summary string (or an object).
   */
  //summarizeLoanChanges(connector: Connector, changes: any): Observable<string> {
  summarizeLoanChanges(changes: any): Observable<string> {
    //const headers = this.buildHeaders();

    // POST to /xai/reason with a JSON body { changes: ... }
    return this.http
      .post<{
        summary: string;
      }>(this.summarizeUrl, { changes }, { headers: {} })
      .pipe(
        map((response) => {
          // The backend is expected to return { summary: string }
          return response.summary;
        }),
        catchError((error) =>
          this.handleError(error, 'Error summarizing loan changes'),
        ),
      );
  }

  /**
   * Common error handler to log and rethrow.
   */
  private handleError(error: any, context: string): Observable<never> {
    console.error(`${context}:`, error);
    return throwError(() => error);
  }
}
