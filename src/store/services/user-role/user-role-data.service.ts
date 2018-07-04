import { GlobalErrorHandler } from './../../../util/services/global-error-handler.service';
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { IAccount } from './../../../models/IAccount';
import { restEndpoint, DataServiceError } from './../data.service';
import {
  USER_ROLE,
  ADMIN_ROLE,
  NO_ROLE
} from '../../reducers/user-role.reducer';

const STAFF_BOOKING_ROLE = 'appointmentbooking';
const STAFF_BOOKING_ADMIN_ROLE = 'appointmentbookingadmin';
const STAFF_SUPER_ADMIN_ROLE = '*';

@Injectable()
export class UserRoleDataService {
  constructor(private http: HttpClient, private errorHandler: GlobalErrorHandler) {}

  getUserRoleInfo(): Observable<string> {
    return this.http
      .get<IAccount>(`${restEndpoint}/account`)
      .pipe(map((res: { modules: string[] }) => {
        const isStaffUser =
          res.modules.filter(module => module === STAFF_BOOKING_ROLE).length > 0
            ? true
            : false;
        const isStaffAdminUser =
          res.modules.filter(module => module === STAFF_BOOKING_ADMIN_ROLE)
            .length > 0
            ? true
            : false;
        const isSuperAdminUser =
          res.modules.filter(module => module === STAFF_SUPER_ADMIN_ROLE)
            .length > 0
            ? true
            : false;
        let userRole = NO_ROLE;
        userRole = isStaffUser ? USER_ROLE : userRole;
        userRole = isStaffAdminUser || isSuperAdminUser ? ADMIN_ROLE : userRole;
        return userRole;
      }))
      .pipe(catchError(this.errorHandler.handleError()));
  }
}
