import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { UserSelectors } from './../../../../store/services/user/user.selectors';
import { CREATE_VISIT, EDIT_VISIT, CREATE_APPOINTMENT, EDIT_APPOINTMENT, ARRIVE_APPOINTMENT } from './../../../../constants/utt-parameters';
import { UserRole } from './../../../../models/UserPermissionsEnum';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AccountSelectors, ServicePointSelectors, CalendarBranchDispatchers, BranchSelectors,
  InfoMsgDispatchers, SystemInfoSelectors, CalendarBranchSelectors, LicenseInfoSelectors, SystemInfoDataService,
  FlowOpenDispatchers, FlowOpenSelectors, JWTTokenDispatchers, JWTTokenSelectors } from 'src/store';

import { ToastService } from '../../../../util/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { QueueService } from '../../../../util/services/queue.service';
import { Recycle } from '../../../../util/services/recycle.service';
import { CalendarService } from '../../../../util/services/rest/calendar.service';
import { NativeApiService } from '../../../../util/services/native-api.service';
import { ISystemInfo } from '../../../../models/ISystemInfo';
import { Util } from '../../../../util/util';
import { ORCHESTRA_VERSIONS } from '../../../../util/version-handller';


@Component({
  selector: 'qm-home-menu',
  templateUrl: './qm-home-menu.component.html',
  styleUrls: ['./qm-home-menu.component.scss']
})
export class QmHomeMenuComponent implements OnInit, OnDestroy {
  //user permissions
  isVisitUser = false;
  isAppointmentUser = false;
  smsEnabled: boolean;
  printerEnabled: boolean;
  ticketLessEnabled: boolean;
  emailEnabled: boolean;
  noNotificationEnabled: boolean;
  qcaCreateURL: string;
  qcaEditURL: string;
  accessbilityStatement: string;

  // final flow permissions
  isCreateVisit = false;
  isEditVisit = false;
  isArriveAppointment = false;
  isEditAppointment = false;
  isCreateAppointment = false;
  isVisitManager = false;
  isEditQCAAppointment = false;
  isCreateQCAAppointment = false;
  userDirection$: Observable<string>;
  isNative:boolean;
  isJWTTokenLoad = false;

  isEditFlowDisabled = false;
  isEditVisitFlowDisabled = false;

  hostAddressStr:string;
  menuItemEnable:boolean;
  menuItemCount: number = 0;

  isFlowOpen:boolean;

  //putting menuItem Names to a 2D array by splitting the words in to half chunks
  menuItemWordArray=new Array();;

  public systemInformation$: Observable<ISystemInfo>;
  public licenseIsValid$: Observable<boolean>;

  private subscriptions: Subscription = new Subscription();


  constructor(private accountSelectors: AccountSelectors, private servicePointSelectors: ServicePointSelectors, private router: Router,
    private userSelectors: UserSelectors, private calendarBranchDispatcher: CalendarBranchDispatchers,
    private toastService: ToastService, private translateService: TranslateService,
    private InfoMsgBoxDispatcher: InfoMsgDispatchers, private recycleService: Recycle, private queueService: QueueService, 
    private calendarService: CalendarService, private systemInfoService: SystemInfoDataService, private branchSelector: BranchSelectors,
    private systemInfoSelectors: SystemInfoSelectors, private calendarBranchSelector: CalendarBranchSelectors,
    private nativeApi: NativeApiService, private licenseInfoSelectors: LicenseInfoSelectors,
    private flowOpenDispatcher:FlowOpenDispatchers, private flowOpenSeletctors:FlowOpenSelectors,
    private jwtTokenDispatcher: JWTTokenDispatchers, private util: Util, private jwtTokenSelectors: JWTTokenSelectors
) {

  }

  ngOnInit() {
    const hostAddressSub = this.systemInfoSelectors.systemInfoHostAddress$.subscribe(hostAddress => {
      this.hostAddressStr = hostAddress;
    });
    const visitManagerSubscriptions = this.systemInfoSelectors.isVisitManager$.subscribe(val => {
      this.isVisitManager = val;
    });
    this.subscriptions.add(visitManagerSubscriptions);
    this.subscriptions.add(hostAddressSub);
    this.checkUserPermissions();
    this.checkUttPermissions();
    this.userDirection$ = this.userSelectors.userDirection$;
    
    this.isNative = this.nativeApi.isNativeBrowser();

    if (this.isAppointmentUser && !this.isVisitManager && (this.isCreateAppointment || this.isEditAppointment) && this.hostAddressStr) {
      this.calendarBranchDispatcher.fetchCalendarBranches();
    }

    const AccountSubscriptions = this.accountSelectors.MenuItemStatus.subscribe(status=>{
        this.menuItemEnable = status;
    });
    this.subscriptions.add(AccountSubscriptions);

    const FlowOpenSubscription = this.flowOpenSeletctors.FlowOpen$.subscribe(status=>{
        this.isFlowOpen  = status
    })
    this.subscriptions.add(FlowOpenSubscription);

    this.systemInformation$ = this.systemInfoSelectors.systemInfo$;
    this.licenseIsValid$ = this.licenseInfoSelectors.isValidLicense$;

    const JWTTokenSubscriptions = this.jwtTokenSelectors.jwtToken$.subscribe(token => {
      if (token !== '') {
        this.isJWTTokenLoad = true;
        if (!this.isVisitManager){
          this.calendarBranchDispatcher.fetchCalendarBranches();
        }
      }
    });
    this.subscriptions.add(JWTTokenSubscriptions);

    //passing menu item names to add to the 2d array
    this.wordSplitter('create_qca_appointment_single_line')
    this.wordSplitter('create_appointment_single_line')
    this.wordSplitter('edit_qca_appointment_single_line')
    this.wordSplitter('edit_appointment_single_line')
    this.wordSplitter('arrive_appointment_single_line')
    this.wordSplitter('create_visit_single_line')
    this.wordSplitter('edit_visit_single_line')
     
  }


  checkUttPermissions() {
    this.servicePointSelectors.uttParameters$.subscribe((uttpParams) => {
      if (uttpParams) {
        this.smsEnabled = uttpParams.sndSMS; 
        this.emailEnabled = uttpParams.sndEmail
        this.printerEnabled = uttpParams.printerEnable;
        this.ticketLessEnabled = uttpParams.ticketLess;
        this.noNotificationEnabled = uttpParams.noNotification;

        this.qcaEditURL = uttpParams.qcaEditUrl;
        this.qcaCreateURL = uttpParams.qcaCreateUrl;

        if (!uttpParams.delAppointment && !uttpParams.reSheduleAppointment) {
          this.isEditFlowDisabled = true;
        }

        var canCherryPick = uttpParams.cherryPick;
        if(!canCherryPick){
            canCherryPick = false;
        }
        var canTransferSP = uttpParams.trServPool;
        var canTransferQ = uttpParams.btnQueueTransfer;
        var canTransferStaff = uttpParams.trUserPool;
        var canTransferQFirst = uttpParams.btnTransferFirst;
        var canTransferQLast = uttpParams.btnTransferLast;
        var canTransferQWait = uttpParams.btnTransferSort;
        var canDelete = uttpParams.delVisit;
        var canSendSMS = uttpParams.sndSMS;
        if (canDelete == false && canCherryPick == false && canTransferSP == false && canTransferQ == false && canSendSMS && canTransferStaff == false &&
           (canTransferQ == false || (canTransferQ == true && canTransferQFirst == false && canTransferQLast == false && canTransferQWait == false))) {
            this.isEditVisitFlowDisabled =true;
        }
      }

      if (this.isVisitUser && uttpParams) {
        this.isCreateVisit = uttpParams[CREATE_VISIT];
        this.isEditVisit = uttpParams[EDIT_VISIT];

        this.menuItemCount = this.isCreateVisit ? this.menuItemCount + 1 : this.menuItemCount + 0;
      }
      else {
        this.isCreateVisit = false;
        this.isEditVisit = false;
      }

      if (this.isAppointmentUser && uttpParams) {
        this.isCreateAppointment = uttpParams[CREATE_APPOINTMENT] && !this.isVisitManager;
        this.isEditAppointment = uttpParams[EDIT_APPOINTMENT] && !this.isVisitManager;
        this.isArriveAppointment = uttpParams[ARRIVE_APPOINTMENT];

        this.isNative = this.nativeApi.isNativeBrowser();
        this.isCreateQCAAppointment = uttpParams.qcaCreateEnable && uttpParams.qcaCreateUrl && uttpParams.qcaCreateUrl.length > 0 && this.isNative === false;
        this.isEditQCAAppointment = uttpParams.qcaEditEnable && uttpParams.qcaEditUrl && uttpParams.qcaEditUrl.length > 0 && this.isNative === false;
        if (uttpParams[CREATE_APPOINTMENT] && uttpParams[EDIT_APPOINTMENT]) {
          this.getJWTToken();
        }

        this.menuItemCount = this.isCreateAppointment ? this.menuItemCount + 1 : this.menuItemCount + 0;
        this.menuItemCount = this.isEditAppointment ? this.menuItemCount + 1 : this.menuItemCount + 0;
        this.menuItemCount = this.isArriveAppointment ? this.menuItemCount + 1 : this.menuItemCount + 0;
        this.menuItemCount = this.isCreateQCAAppointment ? this.menuItemCount + 1 : this.menuItemCount + 0;
        this.menuItemCount = this.isEditQCAAppointment ? this.menuItemCount + 1 : this.menuItemCount + 0;
      }
      else {
        this.isCreateAppointment = false;
        this.isEditAppointment = false;
        this.isArriveAppointment = false;
        this.isCreateQCAAppointment = false;
        this.isEditQCAAppointment = false;
      }
    });
  }

  checkUserPermissions() {
    this.accountSelectors.userRole$.subscribe((ur: UserRole) => {
      if (ur == UserRole.All) {
        this.isAppointmentUser = true;
        this.isVisitUser = true;
      }
      else if (ur == UserRole.AppointmentUserRole) {
        this.isAppointmentUser = true;
      }
      else if (ur == UserRole.VisitUserRole) {
        this.isVisitUser = true;
      }
    });
  }

  getMenuItemCount() {

  }

  getJWTToken() {
    const systmeInfoSubscription = this.systemInfoSelectors.systemInfoProductVersion$
        .subscribe((version) => {
          let status;
          try {
            status = this.util.compareVersions(version.includes('4.1.') ?
            ORCHESTRA_VERSIONS.JWT_TOKEN_SUPPORTED_7_1 : ORCHESTRA_VERSIONS.JWT_TOKEN_SUPPORTED_7_0, version);
          } catch (err) {
            status = 0;
          }
          if (status <= 0) {
            const systmeInfoHostSubscription = this.systemInfoSelectors.distributedAgentStatus$
        .subscribe((value) => {
          if (value) {
            this.jwtTokenDispatcher.fetchJWTToken();
          }
        });
        this.subscriptions.add(systmeInfoHostSubscription);
          }
        });
        this.subscriptions.add(systmeInfoSubscription);

  }

  handleMenuItemClick(route) {
    this.InfoMsgBoxDispatcher.resetInfoMsgBoxInfo();
    // initial check for central connectivity
    if (route === 'create-qca-appointment'){
      window.open(this.qcaCreateURL);
    } else if (route === 'edit-qca-appointment'){
      window.open(this.qcaEditURL);
    } else if (route === 'create-appointment' || route === 'edit-appointment') {
      let calendarBranchId: number;
      const selectedBranchSub = this.branchSelector.selectedBranch$.subscribe((branch => calendarBranchId = branch.id));
      this.subscriptions.add(selectedBranchSub);

      const calendarBranchSub = this.calendarBranchSelector.branches$.subscribe((branches => {
        if (branches && branches.length > 0) {
          let selectedBranch = branches.filter(res => {
            return res.qpId === calendarBranchId;
          });
          if (selectedBranch) {
            calendarBranchId = selectedBranch[0].id;
          }
        }
      }));

      this.subscriptions.add(calendarBranchSub);

      if (calendarBranchId && calendarBranchId > 0) {
        // insert hostaddress if using QAgent(OnHold)
          // this.calendarService.getBranchWithPublicId(calendarBranchId).subscribe(
          this.calendarService.getCalendarSettingsSystemInfo().subscribe(
          value => {
            // if (value && value.branch.publicId) {
              if (value && value.productName) {
                this.handleUttRequirements(route);
            } else {
              this.translateService.get('no_central_access').subscribe(v => {
                this.toastService.errorToast(v);
              });
            }
          }, error => {
            if (error.status === 401) {
              if (this.isJWTTokenLoad) {
                this.jwtTokenDispatcher.fetchJWTToken();
                setTimeout(() => {
                  this.handleMenuItemClick(route);
                }, 2000);
              } else {
                this.queueService.stopQueuePoll();
                this.router.navigate(['home/central-login'], { queryParams : {route} });
                setTimeout(() => {
                  this.flowOpenDispatcher.flowOpen();
                }, 1000);
              }
            } else {
              this.translateService.get('no_central_access').subscribe(v => {
                this.toastService.errorToast(v);
              });
            }
          }
        );
      }
    } else {
      console.log("check")
      this.handleUttRequirements(route);
    }
  }

  handleUttRequirements(route) {
    if (!this.smsEnabled && route == 'create-appointment'  && !this.emailEnabled && !this.noNotificationEnabled) {
      this.translateService.get('no_notification_methods').subscribe(v => {
        this.toastService.errorToast(v);
      })
    } else if (!this.smsEnabled && route == 'arrive-appointment' && !this.printerEnabled && !this.ticketLessEnabled ) {
      this.translateService.get('no_notification_methods').subscribe(v => {
        this.toastService.errorToast(v);
      })
    } else if (!this.smsEnabled && route == 'create-visit' && !this.printerEnabled && !this.ticketLessEnabled)  {
      this.translateService.get('no_notification_methods').subscribe(v => {
        this.toastService.errorToast(v);
      });
    }
    else if (route == 'edit-appointment' && this.isEditFlowDisabled) {
      this.translateService.get('no_actions_available').subscribe(v => {
        this.toastService.errorToast(v);
      });
    }
    else {
      this.recycleService.clearCache();
      this.queueService.stopQueuePoll();
      this.router.navigate(['home/' + route]);
      setTimeout(() => {
        this.flowOpenDispatcher.flowOpen();
      }, 1000);
    }
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  hasValidLicense (systemInfo) {
    return systemInfo.licenseCompanyName !== null && systemInfo.licenseCompanyName !== '';
  }

  //splitting menu item words from the language varibles in to two chunks and adding them to a 2d array (to support ie 11 issue of not properly hiding the words when it overflow)
  wordSplitter(Word){
    this.translateService.get(Word).subscribe(v => {
      let menuName = v;
      //splitting menu item name by spaces
      let splitedName = menuName.split(" ");
      //sclicing menu item name in to two chunks
        let firstArray = splitedName.slice(0,Math.floor(splitedName.length / 2)).toString().replace(/,/g, ' ');
        let secondArray = splitedName.slice(Math.floor(splitedName.length / 2),splitedName.length).toString().replace(/,/g, ' ');
        this.menuItemWordArray.push([firstArray, secondArray]);
    })
  }

  redirectToStatement($event){
    $event.preventDefault();
    this.router.navigate(['accessibility']);
  }
}
