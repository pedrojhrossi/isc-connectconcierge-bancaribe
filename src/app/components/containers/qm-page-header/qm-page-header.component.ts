import { Logout } from "./../../../../util/services/logout.service";
import { AutoClose } from "./../../../../util/services/autoclose.service";
import { IService } from "./../../../../models/IService";
import { UserRole } from './../../../../models/UserPermissionsEnum';
import { CREATE_VISIT, EDIT_VISIT, CREATE_APPOINTMENT, EDIT_APPOINTMENT, ARRIVE_APPOINTMENT } from './../../../../constants/utt-parameters';

import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  Input
} from "@angular/core";

import { Observable } from "rxjs";

import {
  UserSelectors,
  LicenseInfoSelectors,
  ServicePointSelectors,
  BranchSelectors,
  AppointmentDispatchers,
  ReserveDispatchers,
  QueueDispatchers,
  FlowOpenSelectors,
  ServicePointDispatchers,
  AccountSelectors,
  UserRoleSelectors
} from "../../../../store";

import { NativeApiService } from "../../../../util/services/native-api.service";
import { Subscription } from "rxjs";
import { ActivatedRoute, Router } from "@angular/router";
import { APP_URL } from "src/util/url-helper";

import { IServicePoint } from "../../../../models/IServicePoint";
import { IBranch } from "../../../../models/IBranch";

@Component({
  selector: "qm-page-header",
  templateUrl: "./qm-page-header.component.html",
  styleUrls: ["./qm-page-header.component.scss"]
})
export class QmPageHeaderComponent implements OnInit, OnDestroy {
  brandLogoSrc = "assets/images/brand_logo_header.png";
  userFullName$: Observable<string>;
  userDirection$: Observable<string>;
  userIsAdmin$: Observable<boolean>;
  selectedServices$: Observable<IService[]>;
  selectedServices: IService[] = [];
  headerSubscriptions: Subscription = new Subscription();
  isTimeSlotSelected: boolean;
  selectedTime$: Observable<string>;
  private isValidLicense$: Observable<boolean>;
  private isValidLicense: boolean;
  isNative: boolean;
  servicePoint$: Observable<IServicePoint>;
  branchName: string;
  private branch$: Observable<IBranch>;
  showBranch = false;
  showSPointName: boolean = false;
  sPName: string;
  userDirections: string;
  isFlowOpen: boolean;

  isQuickServeEnable: boolean;
  isQuickCreateEnable: boolean;
  isQuickArriveEnable: boolean;
  isHome: boolean;
  isCreateVisit = false;
  isArriveAppointment = false;
  isEditAppointment = false;
  isCreateAppointment = false;

  //user permissions
  isVisitUser = false;
  isAppointmentUser = false;
  isAllOutputMethodsDisabled: boolean;
  printerEnabled: boolean;
  private canAccessApp: boolean;

  @Output()
  clickBackToAppointmentsPage: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  handleHeaderNavigations: EventEmitter<string> = new EventEmitter<string>();

  @Input() isPreventHeaderNavigations = false;
  @Input() isQuickServeShow: boolean;

  public isUserAccessApp$: Observable<boolean>;

  constructor(
    private userSelectors: UserSelectors,
    public route: ActivatedRoute,
    public autoCloseService: AutoClose,
    private router: Router,
    private logoutService: Logout,
    private licenseInfoSelectors: LicenseInfoSelectors,
    private nativeApiService: NativeApiService,
    private branchSelectors: BranchSelectors,
    private servicePointSelectors: ServicePointSelectors,
    private reserveDispatchers: ReserveDispatchers,
    private queueDispatchers: QueueDispatchers,
    private flowOpenSelectors: FlowOpenSelectors,
    private servicePointDispatchers: ServicePointDispatchers,
    private accountSelectors: AccountSelectors,
    private userRoleSelectors: UserRoleSelectors

  ) {
    this.userFullName$ = this.userSelectors.userFullName$;
    this.userDirection$ = this.userSelectors.userDirection$;
    this.isValidLicense$ = this.licenseInfoSelectors.isValidLicense$;
    this.servicePoint$ = this.servicePointSelectors.openServicePoint$;
    this.branch$ = this.branchSelectors.selectedBranch$;
    this.isNative = this.nativeApiService.isNativeBrowser();
    this.isFlowOpen = false;
    this.isUserAccessApp$ = this.userRoleSelectors.isUserAccessApp$;

  }

  ngOnInit() {

    const userDirectionSubscription = this.userSelectors.userDirection$.subscribe(direction => {
      this.userDirections = direction;

    });
    this.headerSubscriptions.add(userDirectionSubscription);
    this.checkUserPermissions();

    const licenseSubscription = this.isValidLicense$.subscribe(
      (licenseIsValid: boolean) => {
        this.isValidLicense = licenseIsValid;
      }
    );
    this.headerSubscriptions.add(licenseSubscription);

    const userAccessSubscription = this.isUserAccessApp$.subscribe(
      (canAccess: boolean) => {
        this.canAccessApp = canAccess;
      }
    );
    this.headerSubscriptions.add(userAccessSubscription);


    const servicePointsSubscription = this.servicePointSelectors.uttParameters$.subscribe(
      uttpParams => {
        if (uttpParams) {
          if (uttpParams.quickVisitAction) {
            if (uttpParams.quickVisitAction === 'serve') {
              this.isQuickCreateEnable = false;
            } else if (uttpParams.quickVisitAction === 'arrive') {
              this.isQuickArriveEnable = true;
              this.isQuickCreateEnable = false;
              this.isQuickServeEnable = false;
            } else if (uttpParams.quickVisitAction === 'create' &&
              (uttpParams.ticketLess || uttpParams.sndSMS || uttpParams.printerEnable)) {
              this.isQuickCreateEnable = true;
            } else {
              this.isQuickCreateEnable = false;
            }
          }
          if (this.isVisitUser && uttpParams) {
            this.isCreateVisit = uttpParams[CREATE_VISIT];
          }
          else {
            this.isCreateVisit = false;
          }

          if (this.isAppointmentUser && uttpParams) {
            this.isCreateAppointment = uttpParams[CREATE_APPOINTMENT];
            this.isEditAppointment = uttpParams[EDIT_APPOINTMENT];
            this.isArriveAppointment = uttpParams[ARRIVE_APPOINTMENT];
          }
          else {
            this.isCreateAppointment = false;
            this.isEditAppointment = false;
            this.isArriveAppointment = false;
          }
        }
      }
    );
    this.headerSubscriptions.add(servicePointsSubscription);



    const servicePointSubscription = this.servicePoint$.subscribe(
      (servicePoint: IServicePoint) => {
        if (servicePoint) {
          this.showBranch = true;
          this.showSPointName = true;
          this.sPName = servicePoint.name;
          this.servicePointDispatchers.setPreviousServicePoint(servicePoint);
        }

      }
    );
    this.headerSubscriptions.add(servicePointSubscription);

    const branchSubscription = this.branch$.subscribe((branch: IBranch) => {
      this.branchName = branch.name;
    });
    this.headerSubscriptions.add(branchSubscription);

    const flowOpenSubscription = this.flowOpenSelectors.FlowOpen$.subscribe(status => {
      this.isFlowOpen = status;
    });
    this.headerSubscriptions.add(flowOpenSubscription);
    // this.isHome = true;
    if (this.router.url == "/home") {
      this.isHome = true;
    } else {
      this.isHome = false;
    }
    this.router.events.subscribe((event) => {
      if (this.router.url == "/home") {
        this.isHome = true;
      } else {
        this.isHome = false;
      }
    });

  }
  ngOnDestroy() {
    this.headerSubscriptions.unsubscribe();
  }

  logout(event: Event) {
    this.reserveDispatchers.unreserveAppointment();
    event.preventDefault();
    if (this.canAccessApp){
      this.logoutService.logout(false);
    } else {
      window.location.href = '/logout.jsp';
    }
  }

  homeClick($event) {
    // $event.preventDefault();
    // window.location.href = APP_URL;
  }

  hasValidLicense(): boolean {
    return this.isValidLicense;
  }
  editClick() {
    this.router.navigate(['/profile']);
    this.queueDispatchers.resetSelectedQueue();
    this.queueDispatchers.setectVisit(null);
    this.queueDispatchers.resetFetchVisitError();

  }
  QuickServeFocus() {
    if (document.getElementById("visitSearch")) {
      document.getElementById("visitSearch").focus();
    }
  }
  MenuBarFocus() {
    if (document.getElementById("create_appointment")) {
      document.getElementById("create_appointment").focus();
    }
  }
  QuickArriveFocus() {
    if (document.getElementById("quick-arrive")) {
      document.getElementById("quick-arrive").focus();
    }
  }
  checkUserPermissions() {
    this.accountSelectors.userRole$.subscribe((ur: UserRole) => {
      if (ur && UserRole.All) {
        this.isAppointmentUser = true;
        this.isVisitUser = true;
      }
      else if (ur && UserRole.AppointmentUserRole) {
        this.isAppointmentUser = true;
      }
      else if (ur & UserRole.VisitUserRole) {
        this.isVisitUser = true;
      }
    });
  }
}
