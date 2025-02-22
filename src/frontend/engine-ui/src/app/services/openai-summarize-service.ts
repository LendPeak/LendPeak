// src/frontend/engine-ui/src/app/services/openAiChat.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Connector } from '../models/connector.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OpenAiChatService {
  private openaiUrl = `${environment.apiUrl}/openai/summarizeLoanChanges`;

  constructor(private http: HttpClient) {}

  summarizeLoanChanges(changes: any): Observable<string> {
    // const headers = this.buildHeaders(connector);

    return this.http
      .post<{ result: string }>(this.openaiUrl, { changes }, { headers: {} })
      .pipe(
        map((response) => response.result),
        catchError((error) =>
          this.handleError(
            error,
            'Error calling OpenAI summarization endpoint',
          ),
        ),
      );
  }

  private handleError(error: any, context: string) {
    console.error(context, error);
    return throwError(() => error);
  }
}
