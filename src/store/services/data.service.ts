import { HttpErrorResponse } from '@angular/common/http';

export const servicePoint = '/rest/servicepoint';
export const calendarEndpoint = '/calendar-backend/api/v1';
export const calendarPublicEndpoint = '/calendar-backend/public/api/v1';
export const calendarPublicEndpointV2 = '/calendar-backend/public/api/v2';
export const managementEndpoint = '/rest/managementinformation/v2';
export const qsystemEndpoint = '/qsystem/rest';
export const applicationId = 'connectconcierge';

export const ERROR_CODE = 'error_code';

export class DataServiceError<T> {
  public errorCode: string = '0';

  constructor(public responseData: any, public requestData?: T) {
    this.parseErrors(responseData);
  }

  private parseErrors(responseData: HttpErrorResponse) {
    if (responseData) {
      this.errorCode = responseData.headers.get(ERROR_CODE) || '0';
    }
  }
}
