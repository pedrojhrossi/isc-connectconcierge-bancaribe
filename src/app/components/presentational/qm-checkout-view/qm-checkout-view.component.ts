import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, ɵConsole } from "@angular/core";
import { Subscription, Observable } from "rxjs";
import { TranslateService } from "@ngx-translate/core";
import { CREATE_VISIT, CREATE_APPOINTMENT, ARRIVE_APPOINTMENT } from "./../../../../constants/utt-parameters";
import {
  ServicePointSelectors, CustomerSelector, ReserveSelectors, DataServiceError, TimeslotSelectors, BranchSelectors,
  ServiceSelectors, InfoMsgDispatchers, CustomerDispatchers, NoteSelectors, NoteDispatchers, CalendarBranchDispatchers,
  CalendarServiceDispatchers, ArriveAppointmentSelectors, UserSelectors, CalendarBranchSelectors, CalendarServiceSelectors, SystemInfoSelectors, ReserveDispatchers
} from "../../../../store";
import { IBranch } from './../../../../models/IBranch';
import { IUTTParameter } from "../../../../models/IUTTParameter";
import { IAppointment } from "../../../../models/IAppointment";
import { ICustomer } from "../../../../models/ICustomer";
import { IServicePoint } from "../../../../models/IServicePoint";
import { IService } from "../../../../models/IService";

import { QmCheckoutViewConfirmModalService } from "../qm-checkout-view-confirm-modal/qm-checkout-view-confirm-modal.service";
import { ToastService } from '../../../../util/services/toast.service';
import { SPService } from "../../../../util/services/rest/sp.service";
import { QmNotesModalService } from "../qm-notes-modal/qm-notes-modal.service";
import { QmModalService } from "../qm-modal/qm-modal.service";
import { CalendarService, NOTIFICATION_TYPE } from "../../../../util/services/rest/calendar.service";

import { FLOW_TYPE, VIP_LEVEL } from "../../../../util/flow-state";
import { Q_ERROR_CODE, ERROR_STATUS } from "../../../../util/q-error";
import { LocalStorage, STORAGE_SUB_KEY } from "../../../../util/local-storage";

import * as moment from 'moment-timezone';
import { ICalendarService } from "../../../../models/ICalendarService";
import { ERROR_CODE_TIMEOUT } from "../../../shared/error-codes";
import { Router } from "@angular/router";
import { QueueService } from "../../../../util/services/queue.service";
import { IBookingInformation } from "src/models/IBookingInformation";
import { DEFAULT_LOCALE } from "src/constants/config";
import { GlobalErrorHandler } from "src/util/services/global-error-handler.service";

@Component({
  selector: "qm-checkout-view",
  templateUrl: "./qm-checkout-view.component.html",
  styleUrls: ["./qm-checkout-view.component.scss"]
})

export class QmCheckoutViewComponent implements OnInit, OnDestroy {
  @Input() flowType: FLOW_TYPE;
  flowTypeStr: string;
  @Output()
  onFlowExit: EventEmitter<any> = new EventEmitter<any>();
  @Output()
  goToPanelByIndex: EventEmitter<number> = new EventEmitter<number>();

  private subscriptions: Subscription = new Subscription();
  uttParameters$: Observable<IUTTParameter>;
  userDirection$: Observable<string>;

  customerEmail: string;
  customerSms: string;

  ticketActionEnabled: boolean = false;
  smsActionEnabled: boolean = false;
  emailActionEnabled: boolean = false;
  ticketlessActionEnabled: boolean = false;
  isNoteEnabled: boolean = false;
  isNoNotificationEnabled: boolean = false;
  isVipLvl1Enabled: boolean = false;
  isVipLvl2Enabled: boolean = false;
  isVipLvl3Enabled: boolean = false;
  buttonEnabled = false;

  ticketSelected: boolean = false;
  smsSelected: boolean = false;
  emailSelected: boolean = false;
  emailAndSmsSelected: boolean = false;
  noNotificationSelected: boolean = false;
  ticketlessSelected: boolean = false;
  vipLevel1Checked: boolean = false;
  vipLevel2Checked: boolean = false;
  vipLevel3Checked: boolean = false;
  isMultiBranchEnabled: boolean = true;
  isAppointmentStatEventEnable = false;

  isCreateVisit: boolean = false;
  isCreateAppointment: boolean = false;
  isArriveAppointment: boolean = false;
  hideCustomer: boolean = false;
  hideCustomerdetails:boolean = false;
  themeColor: string = "#a9023a";
  whiteColor: string = "#ffffff";
  blackColor: string = "#000000";
  ticketColor: string = this.whiteColor;
  smsColor: string = this.whiteColor;
  emailColor: string = this.whiteColor;
  ticketlessColor: string = this.whiteColor;
  userLocale: string = DEFAULT_LOCALE;


  noteText$: Observable<string>;
  noteTextStr: string = '';
  loading: boolean = false;
  isCustomerFlowHidden: boolean;

  selectedVIPLevel: VIP_LEVEL = VIP_LEVEL.NONE;
  selectedAppointment: IAppointment;
  private selectedCustomer: ICustomer;
  private selectedBranch: IBranch;
  private selectedServicePoint: IServicePoint;
  private selectedServices: ICalendarService[];
  private tempCustomer: ICustomer;

  showPriResource = false;
  showsecResource = false;

  // utt
  isPrResourceEnable = false;
  isSecResourceEnable = false;

  //variables related to expandable appointment details view
  serviceStr: string;
  isExpanded: boolean = true;
  appTime: string;
  appId: number;
  appCustomer: string;
  appServices: string;
  timeFormat: string = 'HH:mm';
  servicewiseCustomersEnabled: boolean;
  // focus related issues
  VipButton1Focucsed: boolean;
  VipButton2Focused: boolean;
  VipButton3Focused: boolean;

  constructor(
    private servicePointSelectors: ServicePointSelectors,
    private customerSelector: CustomerSelector,
    private qmCheckoutViewConfirmModalService: QmCheckoutViewConfirmModalService,
    private calendarService: CalendarService,
    private reserveSelectors: ReserveSelectors,
    private translateService: TranslateService,
    private toastService: ToastService,
    private spService: SPService,
    private branchSelector: BranchSelectors,
    private serviceSelectors: ServiceSelectors,
    private qmNotesModalService: QmNotesModalService,
    private noteSelectors: NoteSelectors,
    private noteDispatchers: NoteDispatchers,
    private qmModalService: QmModalService,
    private infoMsgBoxDispatcher: InfoMsgDispatchers,
    private customerDispatcher: CustomerDispatchers,
    private localStorage: LocalStorage,
    private branchDispatcher: CalendarBranchDispatchers,
    private serviceDispatchers: CalendarServiceDispatchers,
    private arriveAppointmentSelectors: ArriveAppointmentSelectors,
    private userSelectors: UserSelectors,
    private CalendarBranchSelectors: CalendarBranchSelectors,
    private calendarServiceSelectors: CalendarServiceSelectors,
    private router: Router,
    private systemInfoSelectors: SystemInfoSelectors,
    private queueService: QueueService,
    private reserveDispatchers: ReserveDispatchers,
    private errorHandler: GlobalErrorHandler
  ) {
    this.userDirection$ = this.userSelectors.userDirection$;

    const timeConventionSub = this.systemInfoSelectors.timeConvention$.subscribe((tc) => {
      if (tc === 'AMPM') {
        this.timeFormat = 'hh:mm A';
      }
      else {
        this.timeFormat = 'HH:mm';
      }
    });


    this.uttParameters$ = servicePointSelectors.uttParameters$;
    const uttSubscription = this.uttParameters$
      .subscribe(uttParameters => {
        if (uttParameters) {
          this.hideCustomer = uttParameters.hideCustomer;
          this.servicewiseCustomersEnabled = uttParameters.servicewiseCustomers;
          this.isNoteEnabled = uttParameters.mdNotes;
          this.isVipLvl1Enabled = uttParameters.vipLvl1;
          this.isVipLvl2Enabled = uttParameters.vipLvl2;
          this.isVipLvl3Enabled = uttParameters.vipLvl3;
          this.smsActionEnabled = uttParameters.sndSMS;
          this.emailActionEnabled = uttParameters.sndEmail;
          this.ticketActionEnabled = uttParameters.printerEnable;
          this.ticketlessActionEnabled = uttParameters.ticketLess;
          this.isMultiBranchEnabled = uttParameters.mltyBrnch;
          this.isAppointmentStatEventEnable = uttParameters.appointmentStatEnable ? uttParameters.appointmentStatEnable : false;
          this.isNoNotificationEnabled = uttParameters.noNotification;
          this.isPrResourceEnable = uttParameters.primaryResource;
          this.isSecResourceEnable = uttParameters.secondaryResource;
          this.hideCustomerdetails = uttParameters.hideCustomerDetails
        }
      })
      .unsubscribe();
    this.subscriptions.add(uttSubscription);


    const customerSubscription = this.customerSelector.currentCustomer$
      .subscribe(customer => {
        this.selectedCustomer = customer;
        if (customer) {
          this.customerEmail = customer.properties.email;
          this.customerSms = customer.properties.phoneNumber;
        }
        else {
          this.customerEmail = null;
          this.customerSms = null;
        }
      });
    this.subscriptions.add(customerSubscription);

    const appointmentSubscription = this.reserveSelectors.reservedAppointment$.subscribe((appointment) => {
      if (appointment) {
        this.selectedAppointment = appointment;
      }
    });
    this.subscriptions.add(appointmentSubscription);

    const tempCustomerSubscription = this.customerSelector.tempCustomer$.subscribe((customer) => {
      if (customer) {
        this.tempCustomer = customer;
        this.customerEmail = customer.email;
        this.customerSms = customer.phone;
      } else {
        this.tempCustomer = null;
        this.customerEmail = null;
        this.customerSms = null;
      }
    });
    this.subscriptions.add(tempCustomerSubscription);

    const selectedAppointmentSubscription = this.arriveAppointmentSelectors.selectedAppointment$.subscribe(appointment => {
      if (appointment) {
        this.selectedAppointment = appointment;
        if (this.selectedAppointment && this.selectedAppointment.customers && this.selectedAppointment.customers.length > 0) {
          this.customerDispatcher.selectCustomer(this.selectedAppointment.customers[0]);
          this.selectedCustomer = this.selectedAppointment.customers[0];
          this.customerSms = this.selectedCustomer.properties.phoneNumber;
        }
        this.resetViewData();
        this.genarateAppointmentData();
      }
    });

    const userLocaleSubscription = this.userSelectors.userLocale$.subscribe(ul => this.userLocale = ul);
    this.subscriptions.add(userLocaleSubscription);
    this.subscriptions.add(selectedAppointmentSubscription);
    this.subscriptions.add(timeConventionSub);
  }


  ngOnInit() {

    switch (this.flowType) {
      case FLOW_TYPE.CREATE_APPOINTMENT:
        this.ticketlessActionEnabled = false;
        this.ticketActionEnabled = false;
        this.isVipLvl1Enabled = false;
        this.isVipLvl2Enabled = false;
        this.isVipLvl3Enabled = false;
        if (this.emailActionEnabled && !this.smsActionEnabled && !this.isNoNotificationEnabled) {
          this.onEmailSelected();
        } else if (!this.emailActionEnabled && this.smsActionEnabled && !this.isNoNotificationEnabled) {
          this.onSmsSelected();
        } else if (!this.emailActionEnabled && !this.smsActionEnabled && this.isNoNotificationEnabled) {
          this.onNoNotificationSelected();
        }
        break;
      case FLOW_TYPE.ARRIVE_APPOINTMENT:
        this.emailActionEnabled = false;
        this.flowTypeStr = FLOW_TYPE.ARRIVE_APPOINTMENT;
        break;
      case FLOW_TYPE.CREATE_VISIT:
        this.emailActionEnabled = false;
        break;
      default:
        break;
    }

    if (this.flowType === FLOW_TYPE.CREATE_VISIT || this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT) {
      const branchSubscription = this.branchSelector.selectedBranch$.subscribe((branch) => {
        this.selectedBranch = branch;
      });

      this.subscriptions.add(branchSubscription);

      const serviceSubscription = this.serviceSelectors.selectedServices$.subscribe(
        (services) => {
          if (services) {
            this.selectedServices = services as ICalendarService[];
            this.appServices = this.setAppServices();
          }
        }
      );
      this.subscriptions.add(serviceSubscription);

      const servicePointSubscription = this.servicePointSelectors.openServicePoint$.subscribe((servicePoint) => this.selectedServicePoint = servicePoint);
      this.subscriptions.add(servicePointSubscription);

    }

    if (this.flowType === FLOW_TYPE.CREATE_VISIT) {
      this.ButtonSelectedByUtt();
    }

    if (this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT && this.selectedAppointment) {
      this.genarateAppointmentData();
      this.ButtonSelectedByUtt();
    }

    if (this.flowType === FLOW_TYPE.CREATE_APPOINTMENT) {
      const branchSubscription = this.CalendarBranchSelectors.selectedBranch$.subscribe((branch) => {
        this.customerDispatcher.resetCurrentCustomer();
        this.resetViewData();

      });
      this.subscriptions.add(branchSubscription);

      const calendarServiceSubscription = this.calendarServiceSelectors.selectedServices$.subscribe(
        (services) => {
          if (services) {
            this.selectedServices = services as ICalendarService[];
            this.appServices = this.setAppServices();
          }
        }
      );
      this.subscriptions.add(calendarServiceSubscription);
    }

    const servicePointsSubscription = this.servicePointSelectors.uttParameters$.subscribe((params) => {
      if (params !== null && params !== undefined) {
        this.isCustomerFlowHidden = params.hideCustomer;
      }
    });
    this.subscriptions.add(servicePointsSubscription);

  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  getShowPriResource(): boolean {
    return this.isPrResourceEnable && this.selectedAppointment?.resourceServiceDecorators?.[0]?.primaryResource;
  }

  getShowSecResource(): boolean {
    return this.isSecResourceEnable && this.selectedAppointment?.resourceServiceDecorators?.[0]?.secondaryResources?.length;
  }

  resetViewData() {
    this.vipLevel1Checked = false;
    this.vipLevel2Checked = false;
    this.vipLevel3Checked = false;
    this.ticketSelected = false;
    this.smsSelected = false;
    this.emailSelected = false;
    this.noNotificationSelected = false;
    this.ticketColor = this.whiteColor;
    this.smsColor = this.whiteColor;
    this.emailColor = this.whiteColor;
    this.ticketlessColor = this.whiteColor;
    this.noteTextStr = '';
    this.buttonEnabled = false;
    this.ButtonSelectedByUtt();
  }

  genarateAppointmentData() {
    if (this.selectedAppointment.startTime) {
      this.appTime = this.setAppTime();
    }
    if (this.selectedAppointment.id) {
      this.appId = this.setAppID();
    }
    if (this.selectedAppointment.customers) {
      this.appCustomer = this.setAppCustomer();
    }
    if (this.selectedAppointment.services) {
      this.appServices = this.setAppServices();
    }

    if (this.selectedAppointment.properties.notes) {
      this.noteTextStr = this.selectedAppointment.properties.notes;
    } else {
      this.noteTextStr = '';
    }
  }

  setAppTime(): string {
    if (this.selectedAppointment.startTime) {
      var startTime = this.selectedAppointment.startTime.split("T")[1].slice(0, 5);
      return startTime;
    }
    return null;
  }

  setAppID(): number {
    return this.selectedAppointment.id;
  }

  setAppCustomer(): string {
    return this.selectedAppointment.customers[0] ?
      this.selectedAppointment.customers[0].firstName + ' ' + this.selectedAppointment.customers[0].lastName : '';
  }

  setAppServices(): string {
    this.selectedServices = this.selectedServices.filter(
      (v, i, a) => a.findIndex(t => (t.id ? (t.id === v.id) : (t.publicId === v.publicId))) === i)
    return this.selectedServices.map(service => {
      return service.name ? service.name : service.internalName;
    }).join(", ");
  }

  toggleCollapse() {
    this.isExpanded ? this.isExpanded = false : this.isExpanded = true;
  }

  onNoteClicked() {
    this.qmNotesModalService.openForTransKeys(this.noteTextStr,
      this.themeColor, 'save', 'label.cancel',
      (result: boolean) => {
        if (result) {
          this.noteText$ = this.noteSelectors.getNote$;
          this.noteText$.subscribe(
            (text) => {

              this.noteTextStr = text;
            }
          ).unsubscribe;
        }

      },
      () => { }, null);

  }

  deleteNote() {
    this.qmModalService.openForTransKeys('', 'delete_current_note', 'label.yes', 'label.no', (result) => {
      if (result) {
        this.noteDispatchers.saveNote(
          {
            text: ''
          }
        );
      }
    }, () => {
    });
  }

  isShowNotifyOptionsInput(): boolean {
    let showNotifyOptionsInput = false;
    if (this.router.url === "/home/create-visit") {
      if (this.smsSelected && !this.customerSms) {
        showNotifyOptionsInput = true;
      }
    } else {
      if (
        (this.smsSelected && !this.customerSms)
        || (this.emailSelected && !this.customerEmail)
        || (this.emailAndSmsSelected && (!this.customerEmail || !this.customerSms))) {
        showNotifyOptionsInput = true;
      }
    }


    return showNotifyOptionsInput;
  }

  onButtonPressed() {
    if (this.router.url === "/home/create-visit") {
      if (this.isShowNotifyOptionsInput()) {
        this.qmCheckoutViewConfirmModalService.openForTransKeys('msg_send_confirmation',
          this.emailSelected || this.emailAndSmsSelected,
          this.smsSelected || this.emailAndSmsSelected,
          this.themeColor, 'ok', 'label.cancel',
          (result: any) => {
            if (result) {
              if (result.phone) {


                this.customerSms = result.phone;
                if (this.selectedCustomer) {
                  this.selectedCustomer.properties['phoneNumber'] = result.phone;
                } else if (this.tempCustomer) {
                  this.tempCustomer.phone = result.phone;
                } else {
                  const Tcustomer: ICustomer = {
                    phone: result.phone
                  };

                  this.customerDispatcher.setTempCustomers(Tcustomer);
                }

                this.handleCheckoutCompletion();
              }
            }
          },
          () => { }, null);
      } else {
        this.handleCheckoutCompletion();
        return;
      }
    } else {
      if (this.isShowNotifyOptionsInput()) {
        this.qmCheckoutViewConfirmModalService.openForTransKeys('msg_send_confirmation',
          this.emailSelected || this.emailAndSmsSelected,
          this.smsSelected || this.emailAndSmsSelected,
          this.themeColor, 'ok', 'label.cancel',
          (result: any) => {
            if (result) {
              if (result.email) {
                this.customerEmail = result.email;
                this.selectedCustomer.properties['email'] = result.email;
              }
              if (result.phone) {
                this.customerSms = result.phone;
                this.selectedCustomer.properties['phoneNumber'] = result.phone;
              }

              if (this.router.url != "/home/create-visit") {
                this.customerDispatcher.updateCustomer(this.selectedCustomer);

              } else if (this.router.url === "/home/create-visit") {
                this.setCreateVisit();
              }

              this.handleCheckoutCompletion();
            }
          },
          () => { }, null);
      } else {
        this.handleCheckoutCompletion();
        return;
      }
    }

  }

  onEmailSelected() {
    if (this.emailSelected) {
      this.emailSelected = false;
      this.smsSelected ? this.buttonEnabled = true : this.buttonEnabled = false;
      return;
    }
    this.emailSelected = true;
    this.emailAndSmsSelected = false;
    this.smsSelected = false;
    this.noNotificationSelected = false;
    this.buttonEnabled = true;
  }


  onTicketSelected() {
    if (this.ticketlessSelected) {

      this.ticketlessSelected = false;
    } else if (this.ticketSelected) {
      this.ticketSelected = false;
      this.smsSelected ? this.buttonEnabled = true : this.buttonEnabled = false;
      return;
    }

    this.ticketSelected = true;
    this.buttonEnabled = true;

  }

  onSmsSelected() {
    if (this.emailActionEnabled) {
      if (this.smsSelected) {
        this.smsSelected = false;
        this.smsColor = this.whiteColor;
        this.emailSelected ? this.buttonEnabled = true : this.buttonEnabled = false;
        return;
      }
    } else {
      if (this.ticketlessSelected) {
        this.ticketlessSelected = false;
        this.ticketlessColor = this.whiteColor;
      } else if (this.smsSelected) {
        this.smsSelected = false;
        this.smsColor = this.whiteColor;
        this.ticketSelected ? this.buttonEnabled = true : this.buttonEnabled = false;
        return;
      }
    }
    this.smsSelected = true;
    this.emailSelected = false;
    this.emailAndSmsSelected = false;
    this.noNotificationSelected = false;
    this.smsColor = this.themeColor;
    this.buttonEnabled = true;
  }

  onEmailAndSmsSelected() {
    this.emailAndSmsSelected = !this.emailAndSmsSelected;
    if (this.emailAndSmsSelected) {
      this.buttonEnabled = true;
      this.smsSelected = false;
      this.emailSelected = false;
      this.noNotificationSelected = false;
    } else {
      this.buttonEnabled = false;
    }
  }

  onNoNotificationSelected() {
    this.noNotificationSelected = !this.noNotificationSelected;
    if (this.noNotificationSelected) {
      this.buttonEnabled = true;
      this.smsSelected = false;
      this.emailSelected = false;
      this.emailAndSmsSelected = false;
    } else {
      this.buttonEnabled = false;
    }

  }

  onTicketlessSelected() {
    if (this.ticketSelected || this.smsSelected) {
      this.ticketSelected = false;
      this.smsSelected = false;
      this.ticketColor = this.whiteColor;
      this.smsColor = this.whiteColor;
      this.ticketlessColor = this.themeColor;
      this.ticketlessSelected = true;
    } else if (this.ticketlessSelected) {
      this.ticketlessSelected = false;
      this.ticketlessColor = this.whiteColor;
      this.buttonEnabled = false;
      return;
    }
    this.ticketlessSelected = true;
    this.ticketlessColor = this.themeColor;
    this.buttonEnabled = true;
  }


  onVip1Clicked() {
    this.vipLevel1Checked ? this.vipLevel1Checked = false : this.vipLevel1Checked = true;
    this.vipLevel2Checked = false;
    this.vipLevel3Checked = false;
    this.selectedVIPLevel = VIP_LEVEL.VIP_1;
  }

  onVip2Clicked() {
    this.vipLevel2Checked ? this.vipLevel2Checked = false : this.vipLevel2Checked = true;
    this.vipLevel1Checked = false;
    this.vipLevel3Checked = false;
    this.selectedVIPLevel = VIP_LEVEL.VIP_2;
  }

  onVip3Clicked() {
    this.vipLevel3Checked ? this.vipLevel3Checked = false : this.vipLevel3Checked = true;
    this.vipLevel2Checked = false;
    this.vipLevel1Checked = false;
    this.selectedVIPLevel = VIP_LEVEL.VIP_3;
  }


  handleCheckoutCompletion() {
    if (this.flowType === FLOW_TYPE.CREATE_APPOINTMENT) {
      this.setCreateAppointment();
    }
    else if (this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT) {
      this.setAriveAppointment();
    }
    else if (this.flowType === FLOW_TYPE.CREATE_VISIT) {
      this.setCreateVisit();
    }
  }

  setCreateAppointment() {
    const bookingInformation: IBookingInformation = {
      branchPublicId: this.selectedAppointment.branch.publicId,
      serviceQuery: this.getServicesQueryString(),
      numberOfCustomers: this.selectedAppointment.customers.length
    };

    if (Math.round(moment.duration(moment().utc().seconds(0).diff(moment(this.selectedAppointment.start).tz(this.selectedAppointment.branch.fullTimeZone))).asMinutes()) > 0) {
      this.translateService.get('toast.appointment.create.timepassed').subscribe(msg => {
        this.toastService.errorToast(msg);
        this.reserveDispatchers.fetchReservableDates(
          bookingInformation
        );
      });
    }
    else {
      var services = null;
      if (this.servicewiseCustomersEnabled) {
        services = this.selectedServices;
      }
      this.calendarService.createAppointment(this.selectedAppointment, this.noteTextStr,
        this.selectedCustomer, this.customerEmail, this.customerSms, this.getNotificationType(), services)
        .subscribe(result => {
          if (result) {
            this.saveFrequentService();
            this.showSuccessMessage(result);
            this.onFlowExit.emit();
            this.queueService.fetechQueueInfo();
            this.setAppointmentStatEvent(result,'CREATE');
          }
        }, error => {
          const err = new DataServiceError(error, null);
          if (err.errorCode === Q_ERROR_CODE.CREATED_APPOINTMENT_NOT_FOUND) {
            this.calendarService.bookAppointment(this.selectedAppointment, this.noteTextStr, this.selectedCustomer, this.customerEmail, this.customerSms, this.getNotificationType()).subscribe(result => {
              this.saveFrequentService();
              this.showSuccessMessage(result);
              this.onFlowExit.emit();
              this.queueService.fetechQueueInfo();
            }, error => {
              this.saveFrequentService();
              this.showErrorMessage(error);



              this.reserveDispatchers.fetchReservableDates(
                bookingInformation
              );
              //this.onFlowExit.emit();
            })
          } else if (err.errorCode === '0') {
            this.handleTimeoutError(err, 'appointment_create_fail');
          }
        });

    }
  }

  setAppointmentStatEvent(result,type) {
    if (this.isAppointmentStatEventEnable) {
      this.calendarService.fetchAppointmentQP((result as IAppointment).publicId?(result as IAppointment).publicId: (result as IAppointment).properties.publicId).subscribe(appointmentRes => {
        const qpAppointment = (appointmentRes as any).appointment;
        if (qpAppointment.qpId) {
          this.calendarService.setAppointmentStatEvent(qpAppointment,type).subscribe(res => { }, err => { });
        }
      }, error => { });
    }
  }

  getServicesQueryString(): string {
    return this.selectedServices.reduce(
      (queryString, service: ICalendarService) => {
        return queryString + `;servicePublicId=${service.publicId}`;
      },
      ""
    );
  }

  setCreateVisit() {
    this.loading = true;
    this.spService.createVisit(this.selectedBranch, this.selectedServicePoint, this.selectedServices, this.noteTextStr, this.selectedVIPLevel, this.selectedCustomer, this.customerSms, this.ticketSelected, this.tempCustomer, this.getNotificationType()).subscribe((result) => {
      this.loading = false;
      this.showSuccessMessage(result);
      this.saveFrequentService();
      this.onFlowExit.emit();
      this.queueService.fetechQueueInfo();
    }, error => {
      const err = new DataServiceError(error, null);
      if (err.errorCode === '0') {
        this.handleTimeoutError(err, 'visit_create_fail');
      } else {
        this.loading = false;
        this.showErrorMessage(error);
        this.saveFrequentService();
      }


    })
  }

  setAriveAppointment() {
    this.loading = true;
    var aditionalList = this.selectedServices.filter(val => {
      return val.isBind === false || val.isBind === undefined
    })
    this.spService.arriveAppointment(this.selectedBranch, this.selectedServicePoint, aditionalList,
      this.noteTextStr, this.selectedVIPLevel, this.customerSms, this.ticketSelected, this.getNotificationType(),
      this.selectedAppointment)
      .subscribe((result) => {
        this.loading = false;
        this.showSuccessMessage(result);
        this.saveFrequentService();
        console.log(this.selectedAppointment)
        this.setAppointmentStatEvent(this.selectedAppointment, 'UPDATE')
        this.onFlowExit.emit();
        this.queueService.fetechQueueInfo();
      }, error => {
        const err = new DataServiceError(error, null);
        if (err.errorCode === '0') {
          this.handleTimeoutError(err, 'arrive_appointment_fail')
        } else {
          this.loading = false;
          this.showErrorMessage(error);
          this.saveFrequentService();
        }
        this.onFlowExit.emit();
        this.queueService.fetechQueueInfo();
      })
  }

  showSuccessMessage(result: any) {
    if (this.flowType === FLOW_TYPE.CREATE_APPOINTMENT) {
      this.translateService.get(['label.appcreated.heading',
        'label.appcreated.subheading',
        'appointment_time', 'label.notifyoptions.smsandemail',
        'label.notifyoptions.sms', 'label.notifyoptions.email']).subscribe(v => {
          var serviceName = ""
          result.services.forEach(val => {
            if (serviceName.length > 0) {
              serviceName = serviceName + ", " + val.name;
            }
            else {
              serviceName = val.name;
            }
          });

          const fieldList = [{
            icon: 'calendar-light',
            label: moment(this.selectedAppointment.start).locale(this.userLocale)
              .tz(this.selectedAppointment.branch.fullTimeZone).format('dddd DD MMMM')
          },
          {
            icon: 'clock',
            label: `<span>${this.getStartTime()}</span><span>&nbsp;-&nbsp;</span><span>${this.getEndTime()}</span>` //rtl issue in simple concat
          },
          {
            icon: 'home',
            label: this.selectedAppointment.branch.name
          },
          {
            icon: 'service',
            label: this.appServices
          }
          ];

          let subheadingText = v['label.appcreated.subheading'];
          if (this.emailAndSmsSelected) {
            subheadingText += ` ${v['label.notifyoptions.smsandemail']}`
          }
          else if (this.emailSelected) {
            subheadingText += ` ${v['label.notifyoptions.email']}`
          }
          else if (this.smsSelected) {
            subheadingText += ` ${v['label.notifyoptions.sms']}`
          } else if (this.noNotificationSelected) {
            subheadingText = '';
          }

          this.qmModalService.openDoneModal(v['label.appcreated.heading'],
            subheadingText, fieldList);

          //this.infoMsgBoxDispatcher.updateInfoMsgBoxInfo(successMessage);
        });
    }
    else if (this.flowType === FLOW_TYPE.CREATE_VISIT) {


      this.translateService.get(['visit_created',
        'label.visitcreated.subheading',
        'label.notifyoptions.smsandemail',
        'label.notifyoptions.sms', 'label.notifyoptions.email', 'label.notifyoptions.ticket', 'label.createvisit.success.subheadingticketandsms']).subscribe(v => {

          let subheadingText = v['label.visitcreated.subheading'];
          if (this.ticketSelected && this.smsSelected) {
            subheadingText = v['label.createvisit.success.subheadingticketandsms'];
          }
          else if (this.ticketlessSelected) {
            subheadingText = "";
          }
          else if (this.ticketSelected) {
            subheadingText = v['label.notifyoptions.ticket'];

          }
          else if (this.smsSelected) {
            subheadingText += ` ${v['label.notifyoptions.sms']}`
          }

          this.qmModalService.openDoneModal(v['visit_created'],
            subheadingText, [], result.ticketId);

        });
    }
    else if (this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT) {
      this.translateService.get(['label.visit_id',
        'label.arrive.success.subheadingsms', 'label.arrive.success.subheadingticket', 'label.arrive.success.heading', 'label.arrive.success.subheadingticketandsms']).subscribe(v => {

          let subheadingText = '';

          if (this.ticketSelected && this.smsSelected) {
            subheadingText = v['label.arrive.success.subheadingticketandsms'];
          }
          else if (this.ticketSelected) {
            subheadingText = v['label.arrive.success.subheadingticket'];

          } else if (this.smsSelected) {
            subheadingText += `${v['label.arrive.success.subheadingsms']}`
          }

          this.qmModalService.openDoneModal(v['label.arrive.success.heading'],
            subheadingText, [], result.ticketId);
        });
    }
  }

  showErrorMessage(error: any) {
    const err = new DataServiceError(error, null);
    let errorKey = 'request_fail';

    if (this.flowType === FLOW_TYPE.CREATE_APPOINTMENT) {
      if (error.status === ERROR_STATUS.BAD_REQUEST) {
        errorKey = 'booking_appointment_error';
      }

    }

    if (this.flowType === FLOW_TYPE.CREATE_VISIT) {
      if (error.status === ERROR_STATUS.INTERNAL_ERROR || error.status === ERROR_STATUS.CONFLICT) {
        errorKey = 'request_fail';
        if (err.errorCode === Q_ERROR_CODE.PRINTER_ERROR || err.errorCode === Q_ERROR_CODE.HUB_PRINTER_ERROR) {
          errorKey = 'printer_error';
        } else if (err.errorMsg.length > 0) {
          if (err.errorCode === Q_ERROR_CODE.QUEUE_FULL) {
            errorKey = 'queue_full';
          }
        }
      } else if (err.errorCode === Q_ERROR_CODE.PRINTER_PAPER_JAM) {
        errorKey = 'paper_jam';
      } else if (err.errorCode === Q_ERROR_CODE.PRINTER_PAPER_OUT) {
        errorKey = 'out_of_paper';
      } else {
        errorKey = 'visit_timeout';
      }

      if (err.errorCode === Q_ERROR_CODE.PRINTER_PAPER_JAM || err.errorCode === Q_ERROR_CODE.PRINTER_PAPER_OUT) {
        this.translateService.get('visit_create_fail').subscribe(v => {
          var successMessage = {
            firstLineName: v,
            icon: "error"
          }
          this.infoMsgBoxDispatcher.updateInfoMsgBoxInfo(successMessage);
        });
      }
    }

    if (this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT) {
      if (error.status === ERROR_STATUS.INTERNAL_ERROR || error.status === ERROR_STATUS.CONFLICT) {
        if (err.errorCode === Q_ERROR_CODE.APPOINTMENT_USED_VISIT) {
          errorKey = 'appointment_already_used';
        } else if (err.errorCode === Q_ERROR_CODE.PRINTER_ERROR || err.errorCode === Q_ERROR_CODE.HUB_PRINTER_ERROR) {
          errorKey = 'printer_error';
        } else if (err.errorCode === Q_ERROR_CODE.QUEUE_FULL) {
          errorKey = 'queue_full';
        } else if (err.errorCode === Q_ERROR_CODE.SERVICE_DELETE) {
          errorKey = '';
        }
        else {
          errorKey = 'request_fail';
        }
      } else if (error.status === ERROR_STATUS.NOT_FOUND) {
        errorKey = 'appointment_not_found_detail';
      } else if (err.errorCode === Q_ERROR_CODE.PRINTER_PAPER_JAM) {
        errorKey = 'paper_jam';
      } else if (err.errorCode === Q_ERROR_CODE.PRINTER_PAPER_OUT) {
        errorKey = 'out_of_paper';
      } else {
        errorKey = 'visit_timeout';
      }

      if (err.errorCode === Q_ERROR_CODE.PRINTER_PAPER_JAM || err.errorCode === Q_ERROR_CODE.PRINTER_PAPER_OUT) {
        this.translateService.get('arrive_appointment_fail').subscribe(v => {
          let successMessage = {
            firstLineName: v,
            icon: "error"
          };

          this.infoMsgBoxDispatcher.updateInfoMsgBoxInfo(successMessage);
        });
      }
    }
    this.errorHandler.showError(errorKey, err);
  }

  showErrorToastMessage(msgKey: string,) {
    this.translateService.get(msgKey).subscribe(v => {
      this.toastService.errorToast(v);
    });
  }

  getNotificationType(): NOTIFICATION_TYPE {
    var notificationType = NOTIFICATION_TYPE.none;
    if ((this.smsSelected && this.emailSelected) || this.emailAndSmsSelected) {
      notificationType = NOTIFICATION_TYPE.both;
    }
    else if (this.smsSelected) {
      notificationType = NOTIFICATION_TYPE.sms;
    }
    else if (this.emailSelected) {
      notificationType = NOTIFICATION_TYPE.email;
    }
    else if (this.noNotificationSelected) {
      notificationType = NOTIFICATION_TYPE.none;
    }

    return notificationType;
  }

  saveFrequentService() {
    var serviceList = [];
    if (this.flowType === FLOW_TYPE.CREATE_VISIT || this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT) {
      this.selectedServices.forEach(val => {
        var idObj = { "id": val.id, "usage": 0 }
        serviceList.push(idObj);
      })
    }
    else if (this.flowType === FLOW_TYPE.CREATE_APPOINTMENT) {
      this.selectedServices.forEach(val => {
        var idObj = { "publicId": val.publicId, "usage": 0 }
        serviceList.push(idObj);
      })
    }
    this.localStorage.setStoreValue(this.localStorage.getStorageKey(this.flowType), this.getMostFrequnetServices(serviceList));
  }

  getMostFrequnetServices(serviceList: any) {
    var tempList = serviceList;


    var serviceIds = this.localStorage.getStoreForKey(this.localStorage.getStorageKey(this.flowType));

    if (serviceIds) {
      tempList = serviceIds.concat(serviceList);
    }

    if (serviceIds && serviceIds.length > 0) {
      if (this.flowType === FLOW_TYPE.CREATE_VISIT || this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT) {
        tempList = this.removeDuplicates(tempList, "id");
      }
      else if (this.flowType === FLOW_TYPE.CREATE_APPOINTMENT) {
        tempList = this.removeDuplicates(tempList, "publicId");
      }
    }

    tempList.forEach(val => {
      var elementPos = -1;
      if (this.flowType === FLOW_TYPE.CREATE_VISIT || this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT) {
        elementPos = serviceList.map(function (x) { return x.id; }).indexOf(val.id);
      }
      else if (this.flowType === FLOW_TYPE.CREATE_APPOINTMENT) {
        elementPos = serviceList.map(function (x) { return x.publicId; }).indexOf(val.publicId);
      }

      if (elementPos >= 0) {
        val.usage = val.usage + 1;
      }
    })
    return tempList;
  }

  getSelectedAppointmentSummaryTime(format = 'dddd DD MMMM', brachTimeZone = this.selectedAppointment.branch ? this.selectedAppointment.branch.fullTimeZone : '') {
    if (this.selectedAppointment && (this.selectedAppointment.start || this.selectedAppointment.startTime)) {

      return brachTimeZone !== '' ? moment((this.selectedAppointment).start || (this.selectedAppointment).startTime)
        .tz(brachTimeZone)
        .locale(this.userLocale)
        .format(format) :
        moment((this.selectedAppointment).start || (this.selectedAppointment).startTime)
          .locale(this.userLocale)
          .format(format);
    }
  }

  removeDuplicates(myArr, prop) {
    return myArr.filter((obj, pos, arr) => {
      return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
    });
  }

  private buildDate(appointment: IAppointment) {
    let dateObj = moment(appointment.start).tz(appointment.branch.fullTimeZone).format(`YYYY-MM-DD, ${this.timeFormat}`);
    return dateObj;
  }

  getTimePeriod() {
    let timeString = moment(this.selectedAppointment.start).tz(this.selectedAppointment.branch.fullTimeZone).format(this.timeFormat);
    timeString += ` - ${moment(this.selectedAppointment.end).tz(this.selectedAppointment.branch.fullTimeZone).format(this.timeFormat)}`;

    return timeString;
  }

  getStartTime() {
    if (this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT) {
      return moment(this.selectedAppointment.startTime).format(this.timeFormat);
    } else {
      return moment(this.selectedAppointment.start).tz(this.selectedAppointment.branch.fullTimeZone).format(this.timeFormat);
    }
  }

  getEndTime() {
    if (this.flowType === FLOW_TYPE.ARRIVE_APPOINTMENT) {
      return moment(this.selectedAppointment.endTime).format(this.timeFormat);
    }
    else {
      return moment(this.selectedAppointment.end).tz(this.selectedAppointment.branch.fullTimeZone).format(this.timeFormat);
    }
  }

  handleTimeoutError(err: DataServiceError<any>, msg: string) {
    if (err.errorCode === '0') {
      this.translateService.get(msg).subscribe(v => {
        var unSuccessMessage = {
          firstLineName: v,
          icon: "error"
        }
        this.infoMsgBoxDispatcher.updateInfoMsgBoxInfo(unSuccessMessage);
      });
      this.onFlowExit.emit();
      this.queueService.fetechQueueInfo();
    }
  }

  onNotesChanged(value) {
    // if(value) {
    this.noteTextStr = value;
    // }

  }

  // Go to previous panels
  goToPanel(ix: number) {
    if (this.flowType == 'CREATE_APPOINTMENT') {
      if (!this.isMultiBranchEnabled && ix != 0) {
        ix = ix - 1;
      }
    }
    this.goToPanelByIndex.emit(ix);
  }

  ButtonSelectedByUtt() {
    switch (this.flowType) {
      case FLOW_TYPE.CREATE_APPOINTMENT:
        if (this.emailActionEnabled && !this.smsActionEnabled && !this.isNoNotificationEnabled) {
          this.onEmailSelected();
        } else if (!this.emailActionEnabled && this.smsActionEnabled && !this.isNoNotificationEnabled) {
          this.onSmsSelected();
        } else if (!this.emailActionEnabled && !this.smsActionEnabled && this.isNoNotificationEnabled) {
          this.onNoNotificationSelected();
        }
        break;
      case FLOW_TYPE.ARRIVE_APPOINTMENT:
      case FLOW_TYPE.CREATE_VISIT:
        if (this.ticketActionEnabled && !this.ticketlessActionEnabled && !this.smsActionEnabled) {
          this.onTicketSelected();
        } else if (!this.ticketActionEnabled && this.ticketlessActionEnabled && !this.smsActionEnabled) {
          this.onTicketlessSelected();
        } else if (!this.ticketActionEnabled && !this.ticketlessActionEnabled && this.smsActionEnabled) {
          this.onSmsSelected();
        }
        break;
      default:
        break;
    }

  }
}


