import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { UserSelectors } from './../../../../store/services/user/user.selectors';
import { CREATE_VISIT, EDIT_VISIT, CREATE_APPOINTMENT, EDIT_APPOINTMENT, ARRIVE_APPOINTMENT } from './../../../../constants/utt-parameters';
import { UserRole } from './../../../../models/UserPermissionsEnum';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AccountSelectors, ServicePointSelectors, CalendarBranchDispatchers, BranchSelectors } from 'src/store';
import { ToastService } from '../../../../util/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { QueueService } from '../../../../util/services/queue.service';
import { Recycle } from '../../../../util/services/recycle.service';
import { CalendarService } from '../../../../util/services/rest/calendar.service';
import { ICalendarBranch } from '../../../../models/ICalendarBranch';
import { ICalendarBranchCentralResponse } from '../../../../models/ICalendarBranchCentralResponse';
import { ActiveToast } from 'ngx-toastr';

@Component({
  selector: 'qm-home-menu',
  templateUrl: './qm-home-menu.component.html',
  styleUrls: ['./qm-home-menu.component.scss']
})
export class QmHomeMenuComponent implements OnInit, OnDestroy {



  //user permissions
  isVisitUser = false;
  isAppointmentUser = false;
  isAllOutputMethodsDisabled: boolean;
  printerEnabled: boolean;

  // final flow permissions
  isCreateVisit = false;
  isEditVisit = false;
  isArriveAppointment = false;
  isEditAppointment = false;
  isCreateAppointment = false;
  userDirection$: Observable<string>;

  isEditFlowDisabled = false;

  private subscriptions: Subscription = new Subscription();


  constructor(private accountSelectors: AccountSelectors, private servicePointSelectors: ServicePointSelectors, private router: Router,
    private userSelectors: UserSelectors, private calendarBranchDispatcher: CalendarBranchDispatchers,
    private toastService: ToastService, private translateService: TranslateService, private recycleService: Recycle, private queueService: QueueService, private calendarService: CalendarService, private branchSelector: BranchSelectors) {

  }

  ngOnInit() {
    this.checkUserPermissions();
    this.checkUttPermissions();
    this.userDirection$ = this.userSelectors.userDirection$;

    if (this.isAppointmentUser && (this.isCreateAppointment || this.isEditAppointment || this.isArriveAppointment)) {
      this.calendarBranchDispatcher.fetchCalendarBranches();
    }

  }


  checkUttPermissions() {
    this.servicePointSelectors.uttParameters$.subscribe((uttpParams) => {
      if (uttpParams) {
        if (!uttpParams.sndEmail && !uttpParams.sndSMS && !uttpParams.ticketLess) {
          this.isAllOutputMethodsDisabled = true;
        }
        this.printerEnabled = uttpParams.printerEnable;

        if(!uttpParams.delAppointment && !uttpParams.reSheduleAppointment){
          this.isEditFlowDisabled = true;
        }
      }

      if (this.isVisitUser && uttpParams) {
        this.isCreateVisit = uttpParams[CREATE_VISIT];
        this.isEditVisit = uttpParams[EDIT_VISIT];
      }
      else {
        this.isCreateVisit = false;
        this.isEditVisit = false;
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
    });
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

  handleMenuItemClick(route) {
    // initial check for central connectivity
    if (route === 'create-appointment') {
      let calendarBranchId: number;
      const selectedBranchSub = this.branchSelector.selectedBranch$.subscribe((branch => calendarBranchId = branch.id));
      this.subscriptions.add(selectedBranchSub);
      if (calendarBranchId && calendarBranchId > 0) {
        this.calendarService.getBranchWithPublicId(calendarBranchId).subscribe(
          value => {
            if (value && calendarBranchId === value.branch.id) {

              this.handleUttRequirements(route);
            } else {
              this.translateService.get('no_central_access').subscribe(v => {
                this.toastService.infoToast(v);
              })
            }
          }
        );
      }
    }else {
      this.handleUttRequirements(route);
    }

  }

  handleUttRequirements(route) {
    if (this.isAllOutputMethodsDisabled && route == 'create-appointment') {
      this.translateService.get('all_methods_disabled').subscribe(v => {
        this.toastService.infoToast(v);
      })
    } else if (this.isAllOutputMethodsDisabled && route == 'arrive-appointment' && !this.printerEnabled) {
      this.translateService.get('all_methods_disabled').subscribe(v => {
        this.toastService.infoToast(v);
      })
    } else if (this.isAllOutputMethodsDisabled && route == 'create-visit' && !this.printerEnabled) {
      this.translateService.get('all_methods_disabled').subscribe(v => {
        this.toastService.infoToast(v);
      })
    }
    else if (route == 'edit-appointment' && this.isEditFlowDisabled ) {
        this.translateService.get('no_actions_available').subscribe(v => {
          this.toastService.infoToast(v);
        });
    }
    else {
      this.recycleService.clearCache();
      this.queueService.stopQueuePoll();
      this.router.navigate(['home/' + route]);
    }
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
