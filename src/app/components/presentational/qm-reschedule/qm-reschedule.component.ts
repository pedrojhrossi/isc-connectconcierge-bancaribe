import { QmModalService } from "./../qm-modal/qm-modal.service";
import { IAppointment } from "./../../../../models/IAppointment";
import { ICalendarService } from "./../../../../models/ICalendarService";
import { IBranch } from "./../../../../models/IBranch";
import {
  CalendarBranchSelectors,
  UserSelectors,
  BranchSelectors,
  ReserveDispatchers,
  ReserveSelectors,
  TimeslotDispatchers,
  ReservationExpiryTimerDispatchers,
  AppointmentDispatchers,
  AppointmentSelectors,
  InfoMsgDispatchers
} from "./../../../../store";
import { ICalendarBranch } from "./../../../../models/ICalendarBranch";
import { Subscription, Observable } from "rxjs";
import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  SimpleChanges,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef
} from "@angular/core";
import {
  CalendarDate,
  QmCalendarComponent
} from "src/app/components/containers/qm-calendar/qm-calendar.component";
import * as moment from "moment";
import { IBookingInformation } from "src/models/IBookingInformation";
import {
  CalendarServiceSelectors,
  ServicePointSelectors,
  SystemInfoSelectors
} from "src/store/services";
import { TranslateService } from "@ngx-translate/core";
import { QueueService } from "../../../../util/services/queue.service";
import { DEFAULT_LOCALE } from "src/constants/config";
import { ISystemInfo } from "src/models/ISystemInfo";
import { CalendarService } from "src/util/services/rest/calendar.service";

enum RescheduleState {
  Default = 1,
  OnDeletion
}

@Component({
  selector: "qm-reschedule",
  templateUrl: "./qm-reschedule.component.html",
  styleUrls: ["./qm-reschedule.component.scss"]
})
export class QmRescheduleComponent implements OnInit, OnDestroy {
  currentlyActiveDate: CalendarDate;
  selectedServices: any;

  private subscriptions: Subscription = new Subscription();
  private branchSubscription$: Observable<ICalendarBranch | IBranch>;
  public reservableDates: moment.Moment[] = [];
  private serviceSubscription$: Observable<ICalendarService[]>;
  public selectedCalendarBranch: ICalendarBranch;
  private rescheduleTime: string;
  noOfCustomers: number = 1;
  originalAppointmentTime: string;
  enableReschedule: boolean = false;
  selectedBranch: ICalendarBranch | IBranch;
  isRescheduleEnabledInUtt: boolean = true;
  isDeleteEnabledInUtt: boolean = true;
  isOriginalAppointmentTimeChanged = false;
  isDateSelected: boolean = false;
  isShowExpandedAppointment: boolean = false;
  isAppointmentStatEventEnable = false;
  
  dateType: string;
  currentDate: string = '';
  timeConvention: string = "24";
  userDirection$: Observable<string>;
  @ViewChild("qmcalendar") qmCalendar: QmCalendarComponent;
  userLocale: string = DEFAULT_LOCALE;
  enterDateErrorMsg: String;
  userDirection: string;
  hideCustomerdetails: boolean = false;
  currentRescheduleState: RescheduleState = RescheduleState.Default;
  selectedDates: CalendarDate[];

  @Input()
  editAppointment: IAppointment;

  @Output()
  onFlowExit: EventEmitter<any> = new EventEmitter();

  @ViewChild('timeSlotsContainer') timeSlotContainer: ElementRef;

  
  // date format related variables
  systemInformation:ISystemInfo;

  constructor(
    private userSelectors: UserSelectors,
    private branchSelectors: BranchSelectors,
    private reserveSelectors: ReserveSelectors,
    private reserveDispatchers: ReserveDispatchers,
    private calendarServiceSelectors: CalendarServiceSelectors,
    private timeSlotDispatchers: TimeslotDispatchers,
    private calendarService: CalendarService,
    private qmModalService: QmModalService,
    private reservationExpiryTimerDispatchers: ReservationExpiryTimerDispatchers,
    private appointmentDispatchers: AppointmentDispatchers,
    private calendarBranchSelectors: CalendarBranchSelectors,
    private servicePointSelectors: ServicePointSelectors,
    private systemInfoSelectors: SystemInfoSelectors,
    private translationService: TranslateService,
    private appointmentSelectors: AppointmentSelectors,
    private queueService: QueueService,
    private SystemInfoSelectors : SystemInfoSelectors,
  ) {
    this.branchSubscription$ = this.branchSelectors.selectedBranch$;
    this.serviceSubscription$ = this.calendarServiceSelectors.selectedServices$;
    this.userDirection$ = this.userSelectors.userDirection$;
    const systemInfoSubscription = this.systemInfoSelectors.systemInfo$.subscribe(systemInfo => {
      this.systemInformation = systemInfo;
    });
    this.subscriptions.add(systemInfoSubscription)
    this.dateType = this.systemInformation.dateConvention;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["editAppointment"] && this.editAppointment) {

      this.enableReschedule = false;
      window["moment"] = moment;
      const calculatedAppointmentTime = moment(this.editAppointment.start).tz(
        this.editAppointment.branch.fullTimeZone
      );
      if (calculatedAppointmentTime.isAfter(moment.now())) {
        this.isOriginalAppointmentTimeChanged = false;
      }
      this.selectedDates = [];
      this.isDateSelected = false;
      this.timeSlotDispatchers.deselectTimeslot();
      this.fetchReservableDates();
    }
  }

  ngOnInit() {
    const branchSubscription = this.branchSubscription$.subscribe(cb => {
      this.selectedBranch = cb;
    });

    const systemInfoSubscription = this.systemInfoSelectors.systemInfo$.subscribe(systemInfo=>{
      this.systemInformation = systemInfo;
    });

    this.subscriptions.add(systemInfoSubscription)
    
    const reservableDatesSub = this.reserveSelectors.reservableDates$.subscribe(
      (dates: moment.Moment[]) => {
        this.reservableDates = dates;
      }
    );

    const serviceSubscription = this.serviceSubscription$.subscribe(s => {
      this.selectedServices = s;
    });
    const userSubscription = this.userDirection$.subscribe((ud)=> {
      this.userDirection = ud.toLowerCase();
    });
    this.subscriptions.add(userSubscription);

    const uttSubscription = this.servicePointSelectors.uttParameters$
      .subscribe(uttParameters => {
        if (uttParameters) {
          this.isRescheduleEnabledInUtt = uttParameters.reSheduleAppointment;
          this.isDeleteEnabledInUtt = uttParameters.delAppointment;
          this.hideCustomerdetails = uttParameters.hideCustomerDetails;
          this.isAppointmentStatEventEnable = uttParameters.appointmentStatEnable ? uttParameters.appointmentStatEnable : false;
        }
      })
      .unsubscribe();

    const calendarBranchsSub = this.calendarBranchSelectors.branches$.subscribe(
      bs => {
        if (this.selectedBranch) {
          this.selectedCalendarBranch = bs.find(
            x => x.qpId == this.selectedBranch.id
          );
        }
      }
    );

    const timeConventionSub = this.systemInfoSelectors.timeConvention$.subscribe(
      tc => {
        this.timeConvention = tc;
      }
    );

    const userLocaleSub = this.userSelectors.userLocale$.subscribe(ul => this.userLocale = ul);

    this.subscriptions.add(calendarBranchsSub);
    this.subscriptions.add(timeConventionSub);
    this.subscriptions.add(uttSubscription);
    this.subscriptions.add(branchSubscription);
    this.subscriptions.add(reservableDatesSub);
    this.subscriptions.add(serviceSubscription);
    this.subscriptions.add(userLocaleSub);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  fetchReservableDates() {
    const bookingInformation: IBookingInformation = {
      branchPublicId: this.editAppointment.branch.publicId,
      serviceQuery: this.getServicesQueryString(),
      numberOfCustomers: this.noOfCustomers
    };

    this.reserveDispatchers.fetchReservableDates(bookingInformation);
  }

  onSelectDate(date: CalendarDate) {
    this.isDateSelected = true;
    this.originalAppointmentTime = null;
    const selectedDate = {...date , mDate : date.mDate.clone()};

    if (
      this.editAppointment &&
      this.editAppointment.services &&
      this.editAppointment.services.length > 0
    ) {
      this.currentlyActiveDate = selectedDate;
      this.timeSlotDispatchers.selectTimeslotDate(selectedDate.mDate.clone());
      this.getTimeSlots();
      this.reservationExpiryTimerDispatchers.hideReservationExpiryTimer();
      this.timeSlotDispatchers.selectTimeslot(null);
      this.currentDate = this.currentlyActiveDate.mDate.clone().locale('en').format(this.dateType).toString();
      this.enterDateErrorMsg = "";
      if (moment(this.editAppointment.start).date() !== selectedDate.mDate.date()) {
        this.originalAppointmentTime = null;
      }
      this.enableReschedule = false;
    }

    if(this.timeSlotContainer && this.timeSlotContainer.nativeElement) {
      this.timeSlotContainer.nativeElement.scrollIntoView();
    }

    this.timeSlotDispatchers.deselectTimeslot();    
  }

  onTimeSlotSelect(time: { title: string }) {
    this.rescheduleTime = time.title;
    this.enableReschedule =
      moment(this.editAppointment.start)
        .tz(this.selectedCalendarBranch.fullTimeZone)
        .format("YYYY-MM-DD HH:mm") !=
      this.currentlyActiveDate.mDate.clone().format("YYYY-MM-DD") +
        " " +
        time.title;
  }

  private getTimeSlots() {
    const bookingInformation: IBookingInformation = {
      branchPublicId: this.editAppointment.branch.publicId,
      serviceQuery: this.getServicesQueryString(),
      numberOfCustomers: this.noOfCustomers,
      date: this.currentlyActiveDate.mDate.format("YYYY-MM-DD"),
      time: this.editAppointment.startTime
    };

    this.timeSlotDispatchers.getTimeslots(bookingInformation);
  }

  getServicesQueryString(): string {
    return this.editAppointment.services.reduce(
      (queryString, service: ICalendarService) => {
        return queryString + `;servicePublicId=${service.publicId}`;
      },
      ""
    );
  }

  
  setAppointmentStatEvent(result,type) {
    if (this.isAppointmentStatEventEnable) {
      // console.log(result)
      // this.calendarService.fetchAppointmentQP((result as IAppointment).publicId).subscribe(appointmentRes => {
      //   const qpAppointment = (appointmentRes as any).appointment;
      //   console.log(qpAppointment)
      //   if (qpAppointment.qpId) {
          this.calendarService.setAppointmentStatEvent(result,type).subscribe(res => { }, err => { });
      //   }
      // }, error => { });
    }
  }


  onCancelAppointment() {
    this.isDateSelected = false;

    this.qmModalService.openForTransKeys(
      "",
      "modal.cancel.appointment.message",
      "label.yes",
      "label.no",
      result => {
        if (result) {
          this.calendarService.setAppointmentStatEvent(this.editAppointment,'DELETE').subscribe(res => { 
            this.appointmentDispatchers.deleteAppointment(
              this.editAppointment,
              () => {
            
                this.showCancelAppointmentSuccessMessage();
              },
              () => {}
            );
          }, err => { 
            console.log('error');
            this.appointmentDispatchers.deleteAppointment(
              this.editAppointment,
              () => {
                this.showCancelAppointmentSuccessMessage();
              },
              () => {}
            );
          });

   
          this.onFlowExit.next(true);
          this.queueService.fetechQueueInfo();
        }
      },
      () => {
        this.onFlowExit.next(true);
        this.queueService.fetechQueueInfo();
      },
      {
        date: this.getSelectedAppointmentInfoDate("DD MMM YYYY")
      }
    );
  }

  showCancelAppointmentSuccessMessage() {
    this.translationService
      .get(
        [
          "label.appointment.cancel.done.heading",
          "label.appointment.cancel.done.subheading"
        ],
        { date: this.getSelectedAppointmentInfoDate("DD MMMM YYYY") }
      )
      .subscribe(v => {
        this.qmModalService.openDoneModal(
          v["label.appointment.cancel.done.heading"],
          v["label.appointment.cancel.done.subheading"],
          []
        );
      });
  }

  onRescheduleAppointment() {
    if (this.enableReschedule) {
      this.qmModalService.openForTransKeys(
        "",
        "modal.reschedule.appointment.message",
        "label.yes",
        "label.no",
        result => {
          if (result) {
            let rescheduleAppointment = this.editAppointment;
            const originalAppointmentStartTime = this.editAppointment.start;
            rescheduleAppointment.start = `${this.currentlyActiveDate.mDate.locale(DEFAULT_LOCALE).format(
              "YYYY-MM-DD"
            )}T${this.rescheduleTime}`;

            const timeDiff = moment.duration(
              moment(this.editAppointment.end).diff(
                originalAppointmentStartTime
              )
            );
            let endTime = moment(rescheduleAppointment.start).add(
              timeDiff.asMinutes(),
              "minutes"
            );
            rescheduleAppointment.end = `${endTime.locale(DEFAULT_LOCALE).format(
              "YYYY-MM-DD"
            )}T${endTime.locale(DEFAULT_LOCALE).format("HH:mm")}`;

            this.appointmentDispatchers.rescheduleAppointment(
              rescheduleAppointment
            );

            this.appointmentSelectors.rescheduleProgress$.subscribe(
              progress => {
                if (progress === true) {
              rescheduleAppointment
              this.setAppointmentStatEvent(rescheduleAppointment,'UPDATE')
                  this.onFlowExit.next(true);
                  this.queueService.fetechQueueInfo();

                }
                else if(progress === false) {
                  this.getTimeSlots();
                }
              }
            );
          }
        },
        () => {}
      );
    }
  }

  getSelectedAppointmentInfoTime() {
    let appointmentInfo = "";
    let timeformat = "hh:mm A";
    if (this.timeConvention === "24") {
      timeformat = "HH:mm";
    }

    if (this.editAppointment) {
      appointmentInfo += moment(this.editAppointment.start)
        .tz(
          this.editAppointment.branch.fullTimeZone ||
            this.selectedCalendarBranch.fullTimeZone
        )
        .format(timeformat);
    }

    return appointmentInfo;
  }

  expandAppointment() {
    this.isShowExpandedAppointment = !this.isShowExpandedAppointment;
  }

  getSelectedAppointmentInfoDate(timeFormat = this.systemInformation.dateConvention) {
    let appointmentInfo = "";

    if (this.editAppointment) {
      //time data
      appointmentInfo += moment(this.editAppointment.start)
        .tz(
          this.editAppointment.branch.fullTimeZone ||
            this.selectedCalendarBranch.fullTimeZone
        )
        .locale(timeFormat.indexOf('MMMM') > 0 ?  this.userLocale : DEFAULT_LOCALE)
        .format(timeFormat);
    }
    return appointmentInfo;
  }

  getSelectedDate(timeFormat = "DD/MM/YYYY") {
    let selectedDate = "";

    if (this.editAppointment && this.currentlyActiveDate) {
      
      selectedDate = this.currentlyActiveDate.mDate.clone()
        .locale(this.userLocale || DEFAULT_LOCALE)
        .format(timeFormat);
    } else {
      selectedDate = this.getSelectedAppointmentInfoDate(timeFormat);
    }

    return selectedDate;
  }

  getSelectedAppointmentInfoCustomer() {
    let appointmentInfo = "";
    if (this.editAppointment && this.editAppointment.customers[0]) {
      if (this.hideCustomerdetails) {
        appointmentInfo = `${this.editAppointment.customers[0].id} `
      } else {
        appointmentInfo += `${this.editAppointment.customers[0].firstName} `;
        appointmentInfo += `${this.editAppointment.customers[0].lastName}`;
      } 
    }
    return appointmentInfo;
  }

  validateDate() {
    if (this.dateType[2] == '-') {
      if (this.currentDate.match(/[0-9]{2}-[0-9]{2}-[0-9]{2}/g) && moment(this.currentDate, this.dateType).isValid()) {
        this.enterDateErrorMsg = "";
        var selectedDateAvailable = false;
        this.reservableDates.forEach(ed => {
          if (ed.isSame(moment(this.currentDate, this.dateType))) {
            selectedDateAvailable = true;
            this.selectedDates = [
              {
                mDate: moment(this.currentDate, this.dateType),
                selected: true
              }
            ];
            if(document.getElementById('qm-time-slot-categories')) {
              document.getElementById('qm-time-slot-categories').focus();
            }
          }
        });
        setTimeout(() => {
          if (selectedDateAvailable == false) {
            const translateSubscription = this.translationService
              .get("select_date_not_available")
              .subscribe((res: string) => {
                this.enterDateErrorMsg = res
              });
            translateSubscription.unsubscribe();
          }
        }, 100);

      } else {
        
        const translateSubscription = this.translationService
          .get("invalid_date_format")
          .subscribe((res: string) => {
            this.enterDateErrorMsg = res
          });
        translateSubscription.unsubscribe();
      }
    } else if (this.dateType[2] == '/') {
      if (this.currentDate.match(/[0-9]{2}\/[0-9]{2}\/[0-9]{2}/g) && moment(this.currentDate, this.dateType).isValid()) {
        this.enterDateErrorMsg = "";
        var selectedDateAvailable = false;
        this.reservableDates.forEach(ed => {
          if (ed.isSame(moment(this.currentDate, this.dateType))) {
            selectedDateAvailable = true;
            this.selectedDates = [
              {
                mDate: moment(this.currentDate, this.dateType),
                selected: true
              }
            ];
          }
        });
        setTimeout(() => {
          if (selectedDateAvailable == false) {
            const translateSubscription = this.translationService
              .get("select_date_not_available")
              .subscribe((res: string) => {
                this.enterDateErrorMsg = res
              });
            translateSubscription.unsubscribe();
          }
        }, 100);

      } else {
        const translateSubscription = this.translationService
          .get("invalid_date_format")
          .subscribe((res: string) => {
            this.enterDateErrorMsg = res
          });
        translateSubscription.unsubscribe();
      }
    }
  }

  onFocus() {
    if(this.userDirection == 'rtl') {
      var setInput = document.getElementById("enterDate");
      this.setSelectionRange(setInput,(<HTMLInputElement>document.getElementById("enterDate")).value.length,(<HTMLInputElement>document.getElementById("enterDate")).value.length)
    }
  }

  setSelectionRange(input, selectionStart, selectionEnd) {
    if (input.setSelectionRange) {
      input.focus();
      input.setSelectionRange(selectionStart, selectionEnd);
    } else if (input.createTextRange) {
      var range = input.createTextRange();
      range.collapse(true);
      range.moveEnd('character', selectionEnd);
      range.moveStart('character', selectionStart);
      range.select();
    }
  }

}
