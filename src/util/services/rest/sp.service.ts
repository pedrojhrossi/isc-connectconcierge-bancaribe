import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { switchMap, mergeMap, catchError } from 'rxjs/operators';
import { DataServiceError, servicePoint } from 'src/store/services/data.service';
import { GlobalErrorHandler } from '../../../util/services/global-error-handler.service';
import { IService } from '../../../models/IService';
import { IBranch } from '../../../models/IBranch';
import { IServicePoint } from '../../../models/IServicePoint';
import { IAccount } from '../../../models/IAccount';


@Injectable()
export class SPService implements OnDestroy {

  constructor(private http: HttpClient, private errorHandler: GlobalErrorHandler) {
    
  }

  ngOnDestroy() {
    
  }

  fetchUserStatus() {
    return this.http
      .get(`${servicePoint}/user/status`);
  }

  fetchWorkstationStatus(branch: IBranch, selectedServicePoint: IServicePoint) {
    return this.http
        .get(`${servicePoint}/branches/${branch.id}/servicePoints/${selectedServicePoint.id}`);
  }

  getWorkstationUsers(branch: IBranch, selectedServicePoint: IServicePoint){
    return this.http
        .get(`${servicePoint}/branches/${branch.id}/servicePoints/${selectedServicePoint.id}/users`);
  }

  logout(force: boolean) {
    return this.http
        .put(`${servicePoint}/logout?force=${force}`, {})
        .pipe(
          catchError(this.errorHandler.handleError())
        );
  }

  login(branch: IBranch, selectedServicePoint: IServicePoint, user: IAccount) {
    return this.http
        .put(`${servicePoint}/branches/${branch.id}/servicePoints/${selectedServicePoint.id}/users/${user.userName}`, {})
        .pipe(
          catchError(this.errorHandler.handleError())
        );
  }

  removeWorkProfile(branch: IBranch, user: IAccount){
    return this.http
        .delete(`${servicePoint}/branches/${branch.id}/users/${user.userName}/workProfile`, {})
        .pipe(
          catchError(this.errorHandler.handleError())
        );
  }

  quickServe(branch: IBranch, openServicePoint: IServicePoint, service : IService){
    var requestBody = {
      "services": [service.id.toString()],
      "parameters":{
        "print":"0"
      }
    }
    return this.http
        .post(`${servicePoint}/branches/${branch.id}/servicePoints/${openServicePoint.id}/visits/createAndEnd`, requestBody)
        .pipe(
          catchError(this.errorHandler.handleError())
        );
  }
}
