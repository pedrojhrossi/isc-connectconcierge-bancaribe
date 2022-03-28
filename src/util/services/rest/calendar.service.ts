import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { GlobalErrorHandler } from '../../../util/services/global-error-handler.service';
import { calendarEndpoint, calendarPublicEndpoint, calendarPublicEndpointV2, appointmentEndPoint } from 'src/store/services/data.service';
import { IAppointment } from '../../../models/IAppointment';
import { ICustomer } from '../../../models/ICustomer';
import { Util } from '../../util';
import * as moment from 'moment-timezone';
import { ICalendarBranchCentralResponse } from '../../../models/ICalendarBranchCentralResponse';
import { catchError, timeout } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { SystemInfoSelectors } from '../../../store';
import { NativeApiService } from '../native-api.service';
import { ISystemInfo } from 'src/models/ISystemInfo';
import { ICalendarService } from 'src/models/ICalendarService';

export enum NOTIFICATION_TYPE {
  email = "email",
  sms = "sms",
  both = "both",
  none = "none"
}

@Injectable()
export class CalendarService implements OnDestroy {

  hostAddress: string;
  authorizationHeader: HttpHeaders;
  private subscriptions: Subscription = new Subscription();

  constructor(private http: HttpClient, private errorHandler: GlobalErrorHandler, private util: Util, private systemInfoSelector: SystemInfoSelectors, private nativeApi: NativeApiService) {
    const hostSubscription = this.systemInfoSelector.centralHostAddress$.subscribe((info) => this.hostAddress = info);
    this.subscriptions.add(hostSubscription);
    const authorizationSubscription = this.systemInfoSelector.authorizationHeader$.subscribe((info) => this.authorizationHeader = info);
    this.subscriptions.add(authorizationSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }


  createAppointment(appointment: IAppointment, notes: string, customer: ICustomer, email: string, sms: string, notificationType: NOTIFICATION_TYPE, services?: ICalendarService[]) {

    if (services) {
      var body = {
        "title": "appointment",
        "notes": notes,
        "customers": [this.buildCustomerObject(customer)],
        "custom": this.buildCustomObject(email, sms, notificationType,null, services)
      }
    } else {
      var body = {
        "title": "appointment",
        "notes": notes,
        "customers": [this.buildCustomerObject(customer)],
        "custom": this.buildCustomObject(email, sms, notificationType, appointment.numberOfCustomers)
      }
    }
    return this.http
      .post(`${this.hostAddress}${calendarPublicEndpointV2}/branches/appointments/${appointment.publicId}/confirm`, body).pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  bookAppointment(appointment: IAppointment, notes: string, customer: ICustomer, email: string, sms: string, notificationType: NOTIFICATION_TYPE) {
    var body = {
      "title": "appointment",
      "notes": this.util.replaceCharcter(notes),
      "services": appointment.services,
      "customers": [this.buildCustomerObject(customer)],
      "custom": this.buildCustomObject(email, sms, notificationType, appointment.numberOfCustomers)
    }
    return this.http
      .post(`${this.hostAddress}${calendarPublicEndpointV2}/branches/${appointment.branch.publicId}/dates/${this.buildDate(appointment)}/times/${this.buildTime(appointment)}/book`, body).pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  fetchAppointmentQP(appointmentId: string) {
    return this.http
      .get(`${this.hostAddress}${calendarEndpoint}/appointments/publicid/${appointmentId}`).pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  setAppointmentStatEvent(appointment: IAppointment,type?:String) {
    const statEventBody = {
      'applicationName': 'Concierge',
      'event': type
    };
    return this.http
      .post
      (`${appointmentEndPoint}/branches/${appointment.branch.id}/appointments/${appointment.qpId}/events/APP_ORIGIN`,
        statEventBody)
      .pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  private buildDate(appointment: IAppointment) {
    let dateObj = moment(appointment.start).tz(appointment.branch.fullTimeZone).format("YYYY-MM-DD");
    return dateObj;
  }

  private buildTime(appointment: IAppointment) {
    let timeObj = moment(appointment.start).tz(appointment.branch.fullTimeZone).format("HH:mm");
    return timeObj;
  }

  private buildCustomObject(email: string, sms: string, notificationType: NOTIFICATION_TYPE, numberOfCustomers : number, services? :ICalendarService[]) {
    var custom = "{\"notificationType\":\"" + notificationType + "\"";
    if (sms && sms.length > 0) {
      custom = custom + ",\"phoneNumber\":\"" + this.util.buildPhoneNumber(sms) + "\"";
    }
    if (email && email.length > 0) {
      custom = custom + ",\"email\":\"" + email + "\"";
    }
    if(services) {
      let serviceViseVisitors = 
      services.map(x => Object.assign({}, x));
      serviceViseVisitors = serviceViseVisitors.map((service)=> {
        delete service.additionalCustomerDuration;
        delete service.duration;
        delete service.showMoreActionsMostFrequent
        delete service.showMoreActions
        delete service.custom;
        return service
      }) 
      custom = custom + `,\"peopleServices\": ${JSON.stringify(serviceViseVisitors)}`;
    }
    if(numberOfCustomers){
      custom = custom + ",\"numberOfCustomers\":\"" + numberOfCustomers + "\"";
    }
    custom = custom + ",\"appId\":\"concierge\"}";

    return custom;
  }

  // There are two different responses when we compare create a customer and search customer response. Want modify customer object according to the response.
  private buildCustomerObject(customer: ICustomer) {
    var customerInfo = {} as ICustomer;

    customerInfo.qpId = customer.id;
    customerInfo.lastName = customer.lastName;
    if (customer.firstName !== undefined) {
      customerInfo.firstName = customer.firstName;
    }
    else if (customer.name !== undefined) {
      customerInfo.firstName = customer.name;
    }
    if (customer.email !== undefined) {
      customerInfo.email = customer.email;
    }
    else if (customer.properties && customer.properties.email !== undefined) {
      customerInfo.email = customer.properties.email;
    }
    if (customer.phone !== undefined) {
      customerInfo.phone = customer.phone;
    }
    else if (customer.properties && customer.properties.phoneNumber !== undefined) {
      customerInfo.phone = customer.properties.phoneNumber;
    }
    if (customer.publicId !== undefined) {
      customerInfo.publicId = customer.publicId;
    }
    else if (customer.properties && customer.properties.publicId) {
      customerInfo.publicId = customer.properties.publicId;
    }
    if (customer.identificationNumber !== undefined) {
      customerInfo.identificationNumber = customer.identificationNumber;
    }
    else if (customerInfo.cardNumber !== undefined) {
      customerInfo.identificationNumber = customer.cardNumber;
    }
    if (customer.created !== undefined) {
      customerInfo.created = customer.created;
    }
    else if (customer.properties && customer.properties.created !== undefined) {
      customerInfo.created = customer.properties.created;
    }

    return customerInfo;
  }

  getBranchWithPublicId(branchId: number) {
    return this.http
      .get<ICalendarBranchCentralResponse>(`${this.hostAddress}${calendarEndpoint}/branches/${branchId}`, { headers: this.authorizationHeader }).pipe(
        catchError(this.errorHandler.handleError(true))
      );
  }

  getCalendarSettingsSystemInfo() {
    return this.http
      .get<ISystemInfo>(`${this.hostAddress}${calendarEndpoint}/settings/systemInformation`, { headers: this.authorizationHeader })
      .pipe(timeout(6000), catchError(this.errorHandler.handleError(true)));
  }
}
