import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { restEndpoint, centralRestEndPoint, calendarEndpoint } from '../data.service';

import { ISystemInfo } from '../../../models/ISystemInfo';
import { Observable } from 'rxjs';
import { SystemInfoSelectors } from './system-info.selectors';
import { catchError } from 'rxjs/operators';


@Injectable()
export class SystemInfoDataService {

  hostAddress: string;
  authorizationHeader: HttpHeaders;
  errorHandler: any;

  constructor(private http: HttpClient, private systemInfoSelector: SystemInfoSelectors) {
    const hostSubscription = this.systemInfoSelector.centralHostAddress$.subscribe((info) => this.hostAddress = info);
    const authorizationSubscription = this.systemInfoSelector.authorizationHeader$.subscribe((info) => this.authorizationHeader = info);
  }

  getSystemInfo(): Observable<ISystemInfo> {
    return this.http
      .get<ISystemInfo>(`${restEndpoint}/managementinformation/systemInformation`)
      // .get<ISystemInfo>(`${restEndpoint}/servicepoint/systemInformation`)
      .pipe();
  }

  getServicePointSystemInfo(): Observable<ISystemInfo> {
    return this.http
    // .get<ISystemInfo>(`${this.hostAddress}${centralRestEndPoint}/servicepoint/systemInformation`)
      .get<ISystemInfo>(`${restEndpoint}/servicepoint/systemInformation`)
      .pipe();
  }

  getCalendarSettingsSystemInfo(): Observable<ISystemInfo> {
    return this.http
      .get<ISystemInfo>(`${this.hostAddress}${calendarEndpoint}/settings/systemInformation`)
      .pipe(catchError(this.errorHandler.handleError(true)));
  }
}
