import { UserSelectors } from 'src/store/services';
import { IService } from './../../../../models/IService';
import { Subscription, Observable, Subject } from 'rxjs';
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { ServiceSelectors, ServiceDispatchers, BranchSelectors, ServicePointSelectors } from '../../../../../src/store';
import { IBranch } from '../../../../models/IBranch';
import { SPService } from 'src/util/services/rest/sp.service';
import { IServicePoint } from '../../../../models/IServicePoint';
import { TranslateService } from '@ngx-translate/core';
import { ToastService } from 'src/util/services/toast.service';
import { IServiceConfiguration } from '../../../../models/IServiceConfiguration';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { DEBOUNCE_TIME } from './../../../../constants/config';
import { Server } from 'https';


@Component({
  selector: 'qm-quick-serve',
  templateUrl: './qm-quick-serve.component.html',
  styleUrls: ['./qm-quick-serve.component.scss']
})
export class QmQuickServeComponent implements OnInit, OnDestroy {

  @ViewChild('configServiceList') configServiceList: any;


  private subscriptions: Subscription = new Subscription();
  services: IServiceConfiguration[] = new Array<IServiceConfiguration>();
  selectedService: IService;
  private selectedBranch: IBranch;
  private selectedServicePoint: IServicePoint;
  userDirection$: Observable<string>;
  private isBottomBarVisible: boolean;
  private isTopBarVisible: boolean;
  searchText: String;
  filterText: string = '';
  inputChanged: Subject<string> = new Subject<string>();
  showToolTip: boolean;
  hoveredService: string = '';

  isQuickServeEnable: boolean;
  isShowQueueView: boolean;
  editVisitEnable: boolean;
  focusQuickServeItem:string;
  @Output() QuickServeServicesEnabled = new EventEmitter<boolean>();

  constructor(
    private serviceSelectors: ServiceSelectors,
    private servicePointSelectors: ServicePointSelectors,
    private branchSelectors: BranchSelectors,
    private serviceDispatchers: ServiceDispatchers,
    private spService: SPService,
    private translateService: TranslateService,
    private toastService: ToastService,
    private userSelectors: UserSelectors
  ){

    this.showToolTip =false;
    this.userDirection$ = this.userSelectors.userDirection$;

    const servicePointSubscription = this.servicePointSelectors.openServicePoint$.subscribe((servicePoint) => this.selectedServicePoint = servicePoint);
    this.subscriptions.add(servicePointSubscription);


    const servicePointsSubscription = this.servicePointSelectors.uttParameters$.subscribe(
      params => {
        if (params) {
          this.isQuickServeEnable = params.quickServe;
          this.isShowQueueView = params.queueView;
          this.editVisitEnable = params.editVisit;
          if (params.quickVisitAction) {
            if (params.quickVisitAction === 'serve') {
              this.isQuickServeEnable = true;
            } else {
              this.isQuickServeEnable = false;
            }
          }
        }
      }
    );
    this.subscriptions.add(servicePointsSubscription);

    const branchSubscription = this.branchSelectors.selectedBranch$.subscribe((branch) => this.selectedBranch = branch);
    this.subscriptions.add(branchSubscription);

    let serviceLoadedSubscription;
    const serviceConfigSubscription = this.serviceSelectors.getQuickServices$.subscribe((services) => {
      this.services = services;
      serviceLoadedSubscription = this.serviceSelectors.isQuickServiceLoaded$.subscribe((val) => {
        if (val) {
          if (this.services.length === 0) {
            this.QuickServeServicesEnabled.emit(false);
          } else {
            this.QuickServeServicesEnabled.emit(true);
            setTimeout(() => {
              this.checkShadow();
            }, 1000);
          }
        }
      });
    });
    this.subscriptions.add(serviceLoadedSubscription);
    this.subscriptions.add(serviceConfigSubscription);

    const serviceSubscription = this.serviceSelectors.services$.subscribe((services) => {
      var serviceDispatchers = this.serviceDispatchers;
      var selectedBranch = this.selectedBranch;
      var quickService = this.services;
      if(services.length === 0){
        this.serviceDispatchers.fetchServices(selectedBranch);
      }
      if(services && services.length > 0 && selectedBranch && quickService.length === 0){
        serviceDispatchers.fetchServiceConfiguration(selectedBranch, services);
      }
    });
    this.subscriptions.add(serviceSubscription);

    const selectedServiceSubscription = this.serviceSelectors.selectedServices$.subscribe((services) => {
      if(services.length > 0){
        this.selectedService = services[0];
      }
      else{
        this.selectedService = null;
      }
    });
    this.subscriptions.add(selectedServiceSubscription);

    this.inputChanged
    .pipe(distinctUntilChanged(), debounceTime(DEBOUNCE_TIME || 0))
    .subscribe(text => this.filterQueues(text));

  }

  ngOnInit() {
    this.selectedService = null;
    this.userDirection$ = this.userSelectors.userDirection$;
    this.isBottomBarVisible = true;
    this.isTopBarVisible = false;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  checkShadow(){
    this.onScroll(this.configServiceList.nativeElement);
  }
  ServiceSelectKeyPressed(selectedService: IService, $event) {
    if ($event.keyCode == 32 ) {
      $event.preventDefault();
      this.onServiceSelect(selectedService);
    }
  }
  onServiceSelect(selectedService: IService) {

    this.showToolTip = false;
    if(this.selectedService === selectedService){
      this.selectedService = null;
      this.serviceDispatchers.setSelectedServices([]);
    }
    else{
      this.selectedService = selectedService;
      this.serviceDispatchers.setSelectedServices([selectedService]);
    }
  }

  onServe() {
    this.showToolTip = false;
    this.spService.quickServe(this.selectedBranch, this.selectedServicePoint, this.selectedService).subscribe((status: any) => {
      if(status){
        this.translateService.get('quick_serve_toast').subscribe(v => {
          this.toastService.infoToast(this.selectedService.internalName + ' ' + v);
          this.selectedService = null;
          var searchBox = document.getElementById("visitSearch") as any;
          searchBox.value="";
          this.filterText = '';
        });
      } else{
        this.toastService.errorToast("error");
      }
    }
  );

  }

  onScroll(eliment){
    let scrollHeight = eliment.scrollHeight;
    let scrollTop = eliment.scrollTop;
    let viewHight = eliment.offsetHeight;

    if((scrollTop + viewHight) > scrollHeight){
      if(this.isBottomBarVisible){
        this.isBottomBarVisible = false;
      }
    }
    else{
      if(!this.isBottomBarVisible){
        this.isBottomBarVisible = true;
      }
    }

    if(scrollTop === 0){
      if(this.isTopBarVisible){
        this.isTopBarVisible = false;
      }
    }
    else{
      if(!this.isTopBarVisible){
        this.isTopBarVisible = true;
      }
    }
  }


filterQueues(newFilter: string) {
  this.filterText = newFilter;
 }

  clearSearchText() {
    this.filterText = "";
  }

  handleInput($event) {
    // this.queueSearched = true;
    this.inputChanged.next($event.target.value);
  }



  sortQueueList() {
    if (this.services) {
      // sort by name
      this.services = this.services.slice().sort((a, b) => {


              // var nameA = a.name.toUpperCase(); // ignore upper and lowercase
              // var nameB = b.name.toUpperCase(); // ignore upper and lowercase

              var stateA = a.internalName.toUpperCase(); // ignore upper and lowercase
              var stateB = b.internalName.toUpperCase(); // ignore upper and lowercase

              if (stateA < stateB) {
                return 1;
              }
              // if (stateA > stateB ) {
              //   return -1;
              // }


              // names must be equal
              return 0;
        })
    }

  }

  showHideToolTip(){
    this.showToolTip = !this.showToolTip;
  }
  handleCheckBoxClick(){

  }

  focusQmCheckbox(service){
   this.focusQuickServeItem = service.id;
  }

  focusOutQmCheckbox(){
    this.focusQuickServeItem = null;
  }

  MouseEnteredCheckbox(service) {
    this.hoveredService = service.id;
  }
  MouseLeaveCheckbox() {
    this.hoveredService = '';
  }
  serviceId(internalName: string) {
    return internalName.replace(/\s/g, '');
  }

}
