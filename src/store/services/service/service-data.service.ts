import { GlobalErrorHandler } from './../../../util/services/global-error-handler.service';
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  calendarEndpoint,
  calendarPublicEndpoint,
  DataServiceError,
  servicePoint
} from '../data.service';

import { IServiceResponse } from '../../../models/IServiceResponse';
import { IServiceGroup } from '../../../models/IServiceGroup';
import { ICalendarServiceResponse } from '../../../models/ICalendarServiceResponse';

@Injectable()
export class ServiceDataService {
  constructor(private http: HttpClient, private errorHandler: GlobalErrorHandler) {}

  getServices(): Observable<IServiceResponse> {
    return this.http
      .get<IServiceResponse>(`${servicePoint}/services/`)
      .pipe(catchError(this.errorHandler.handleError()));
  }
}
