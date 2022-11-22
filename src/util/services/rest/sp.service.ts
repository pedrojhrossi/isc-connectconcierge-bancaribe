import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { switchMap, mergeMap, catchError, map } from 'rxjs/operators';
import { DataServiceError, servicePoint } from 'src/store/services/data.service';
import { GlobalErrorHandler } from '../../../util/services/global-error-handler.service';
import { IService } from '../../../models/IService';
import { IBranch } from '../../../models/IBranch';
import { IServicePoint } from '../../../models/IServicePoint';
import { IAccount } from '../../../models/IAccount';
import { ICustomer } from '../../../models/ICustomer';
import { Util } from '../../util';
import { NOTIFICATION_TYPE } from './calendar.service';
import { VIP_LEVEL } from '../../flow-state';
import { IAppointment } from '../../../models/IAppointment';
import { Queue } from '../../../models/IQueue';
import { Visit } from '../../../models/IVisit';
import { IUser } from '../../../models/IUser';
import { ToastService } from '../toast.service';
import { empty } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';


@Injectable()
export class SPService implements OnDestroy {

  constructor(private http: HttpClient, private errorHandler: GlobalErrorHandler,
    private toastService:ToastService, private util: Util,
    private translateService:TranslateService) {

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

  getWorkstationUsers(branch: IBranch, selectedServicePoint: IServicePoint) {
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

  removeWorkProfile(branch: IBranch, user: IAccount) {
    return this.http
      .delete(`${servicePoint}/branches/${branch.id}/users/${user.userName}/workProfile`, {})
      .pipe(
        catchError(this.errorHandler.handleError())
      );
  }

  quickServe(branch: IBranch, openServicePoint: IServicePoint, service: IService) {
    var requestBody = {
      "services": [service.id.toString()],
      "parameters": {
        "print": "0"
      }
    }
    return this.http
      .post(`${servicePoint}/branches/${branch.id}/servicePoints/${openServicePoint.id}/visits/createAndEnd`, requestBody)
      .pipe(
        catchError(
          err => {
            const error = new DataServiceError(err, null);
            if(error.errorCode ==='8042'){
              this.translateService.get('queue_full').subscribe(v => {
                 this.toastService.errorToast(v);
              });
            }
            else if(error.errorCode == '0') {
              this.translateService.get('generic.error.notification').subscribe(v => {
                this.toastService.errorToast(v);
             });
            }
            else if (error.errorCode === '8096') {
              this.translateService.get(['request_fail', 'messages.error.generic.with.context'],{errorCode: error.errorCode}).subscribe(errorMsgs => {
                this.toastService.errorToast(`${errorMsgs['request_fail']} ${errorMsgs['messages.error.generic.with.context']}`);
             });
            }

            this.errorHandler.handleError()
            return  empty();

        }));
  }

  queueTransfer(branch: IBranch, openServicePoint: IServicePoint, ToQueue: Queue, visit: Visit, sortPolicy: string) {
    var requestBody = {
      fromBranchId: branch.id,
      fromId: openServicePoint.id,
      sortPolicy: sortPolicy,
      visitId: visit.visitId
    }
    return this.http
      .put(`${servicePoint}/branches/${branch.id}/queues/${ToQueue.id}/visits`, requestBody)
      .pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  servicePointTransfer(branch: IBranch, openServicePoint: IServicePoint, ToServicePoint: IServicePoint, visit: Visit) {
    var requestBody = {
      fromBranchId: branch.id,
      fromId: openServicePoint.id,
      visitId: visit.visitId
    }
    return this.http
      .put(`${servicePoint}/branches/${branch.id}/servicePoints/${ToServicePoint.id}/visits`, requestBody)
      .pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  staffPoolTransfer(branch: IBranch, openServicePoint: IServicePoint, ToUserID: number, visit: Visit) {
    var requestBody = {
      fromBranchId: branch.id,
      fromId: openServicePoint.id,
      visitId: visit.visitId
    }
    return this.http
      .put(`${servicePoint}/branches/${branch.id}/users/${ToUserID}/visits`, requestBody)
      .pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  sendSMSEvent(branchId: number, visit: Visit, phoneNumber: string) {
    const smsEventName = 'SEND_VISIT_SMS';
    const body = {
      "visit": JSON.stringify(visit),
      "phoneNumber": phoneNumber,
    };

    return this.http
      .post(`${servicePoint}/branches/${branchId}/visits/${visit.visitId}/events/${smsEventName}`, body)
      .pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  updateCustomParameter(branchId: number, visit: Visit, phoneNumber: string) {
    const tmpPhone = this.util.buildPhoneNumber(phoneNumber);
    const body = {
      'phoneNumber': tmpPhone,
      'primaryCustomerPhoneNumber': tmpPhone,
      'custom4': tmpPhone,
    };

    return this.http
      .put(`${servicePoint}/branches/${branchId}/visits/${visit.visitId}/parameters/`, body)
      .pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  createVisit(branch: IBranch, selectedServicePoint: IServicePoint, services: IService[], notes: string, vipLevel: VIP_LEVEL, customer: ICustomer, sms: string, isTicketPrint: boolean, tempCustomer: ICustomer, notificationType: NOTIFICATION_TYPE) {
    var body = {
      "services": this.buildService(services),
      "customers": customer ? [customer.id] : [],
      "parameters": this.buildParametersObject(sms, isTicketPrint, notes, vipLevel, customer, notificationType,null,null)
    }

    return this.http
      .post(`${servicePoint}/branches/${branch.id}/servicePoints/${selectedServicePoint.id}/visit/create`, body)
      .pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  arriveAppointment(branch: IBranch, selectedServicePoint: IServicePoint,
    services: IService[], notes: string, vipLevel: VIP_LEVEL, sms: string, isTicketPrint: boolean, notificationType: NOTIFICATION_TYPE, appointment: IAppointment) {
    var selectedServicesWithPeopleServices = (appointment.properties.custom && JSON.parse(appointment.properties.custom).peopleServices) ?
    appointment.properties.custom && JSON.parse(appointment.properties.custom).peopleServices : null;
    var numberOfCustomers = (appointment.properties.custom && JSON.parse(appointment.properties.custom).numberOfCustomers) ?
    appointment.properties.custom && parseInt(JSON.parse(appointment.properties.custom).numberOfCustomers) : null;

    var body = {
      "services": this.buildService(services),
      "customers": appointment.customers[0] ? [appointment.customers[0].id] : [],
      "appointmentId": appointment.id,
      "parameters": this.buildParametersObject(sms, isTicketPrint, notes, vipLevel, null, notificationType,numberOfCustomers, selectedServicesWithPeopleServices)
    }
    return this.http
      .post(`${servicePoint}/branches/${branch.id}/servicePoints/${selectedServicePoint.id}/visit/create`, body).pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

    validateNull(val){
    let sw = false;
    if(val !== null && val !== undefined && val !== ''){
      sw = true;
      return sw
    }
    return sw
  }

  private buildParametersObject(sms: string, isTicketPrint: boolean, notes: string, vipLevel: VIP_LEVEL,
    tempCustomer: ICustomer, notificationType: NOTIFICATION_TYPE, numberOfCustomers:number, peopleServices: string) {
    var params = {
      "notificationType": notificationType,
      "appId": "concierge",
      "print": isTicketPrint ? "1" : "0",
    }

    if (tempCustomer) {
        params["custom2"] = this.validateNull(tempCustomer.cardNumber) ? tempCustomer.cardNumber : tempCustomer.properties.externalId //* PJHR;
    }

    if (sms && sms.length > 0) {
      params["phoneNumber"] = this.util.buildPhoneNumber(sms);
    }
    if (notes && notes.length > 0) {
      params["custom1"] = notes;
    }
    if(peopleServices) {
      params["peopleServices"] = JSON.stringify(peopleServices);
    }
    if(numberOfCustomers) {
      params["numberOfCustomers"] = numberOfCustomers;
    }
    if (vipLevel !== VIP_LEVEL.NONE) {
      params["level"] = vipLevel;
    }
    if ((sms && sms.length === 0) || tempCustomer && tempCustomer.phone && tempCustomer.phone.length > 0) {
      params["phoneNumber"] = this.util.buildPhoneNumber(tempCustomer.phone);
      params["primaryCustomerPhoneNumber"] = this.util.buildPhoneNumber(tempCustomer.phone); // TEN-298+CONCI-933
      params["custom4"] = this.util.buildPhoneNumber(tempCustomer.phone); // TEN-298+CONCI-933
    }
    if (tempCustomer && tempCustomer.email && tempCustomer.email.length > 0) {
      params["email"] = tempCustomer.email;
      params["primaryCustomerEmail"] = tempCustomer.email; // TEN-298+CONCI-933
      params["custom5"] = tempCustomer.email; // TEN-298+CONCI-933
    }
    if (tempCustomer && ((tempCustomer.firstName && tempCustomer.firstName.length > 0) || (tempCustomer.lastName && tempCustomer.lastName.length > 0))) {
      params["customers"] = tempCustomer.firstName + " " + tempCustomer.lastName;
      // start: TEN-298+CONCI-933
      params["primaryCustomerFirstName"] = tempCustomer.firstName;
      params["primaryCustomerLastName"] = tempCustomer.lastName;
      params["custom3"] = tempCustomer.firstName + ' ' + tempCustomer.lastName;
      // end
    }

    if (tempCustomer && tempCustomer.dob) {
      params["primaryCustomerDateOfBirth"] = new Date(tempCustomer.dob);
    }
    return params;
  }

  buildService(services: IService[]) {
    var tempArr = [];
    services.forEach(val => {
      tempArr.push(val.id);
    });

    return tempArr;
  }

  updateCustomerPartially(customer: ICustomer) {

    return this.http
      .put<ICustomer>(`${servicePoint}/customers/${customer.id}`, customer)
  }

  cherryPickVisit(branchId: number, spId: number, visitId: number) {

    return this.http
      .post(`${servicePoint}/branches/${branchId}/servicePoints/${spId}/visits/${visitId}/callAndEnd`, null).pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  deleteVisit(branchId: number, spId: number, visitId: number) {

    return this.http
      .delete(`${servicePoint}/branches/${branchId}/servicePoints/${spId}/visits/${visitId}`).pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }


  getSelectedVisitByVisitId(branchId: number, visitid: number) {
    return this.http
      .get<Visit>(`${servicePoint}/branches/${branchId}/visits/${visitid}`)
      .pipe(map((data) => {
        return this.processVisitInfo(data);
      })).pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }
  private formatTimeHHMM(totalSeconds) {
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);

    var result = (hours < 10 ? "0" + hours : hours);
    result += ":" + (minutes < 10 ? "0" + minutes : minutes);
    return result;
  }

  private formatHHMMSSIntoHHMM(time: string) {
    return time.substring(0, 5);
  }

  private addHyphonIfInvalidValue(visit) {
    for (var key in visit) {
      if (visit.hasOwnProperty(key)) {
        if (visit[key] == undefined || visit[key] == "") {
          visit[key] = "-";
        }
      }
    }
  }

  private processVisitInfo(visit: Visit) {

      visit.customerName = visit.parameterMap.customers;
      visit.serviceName = visit.currentVisitService.serviceExternalName;
      visit.waitingTimeStr = this.formatTimeHHMM(visit.waitingTime);
      visit.appointmentTime ? visit.appointmentTime = this.formatHHMMSSIntoHHMM(visit.appointmentTime.split("T")[1]) : null;
      this.addHyphonIfInvalidValue(visit);
      visit.visitId = visit.id;
      visit.queueId = visit.parameterMap.currentQueueOrigId;

    return visit;
  }

}




