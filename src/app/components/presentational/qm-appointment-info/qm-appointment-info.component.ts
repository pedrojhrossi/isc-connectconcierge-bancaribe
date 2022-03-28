import { Component, OnInit, Input, Output, EventEmitter,
  HostBinding, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { SystemInfoSelectors, UserSelectors, ServicePointSelectors } from 'src/store';
import { Subscription, Observable } from 'rxjs';
import { ISystemInfo } from 'src/models/ISystemInfo';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'qm-appointment-info',
  templateUrl: './qm-appointment-info.component.html',
  styleUrls: ['./qm-appointment-info.component.scss']
})
export class QmAppointmentInfoComponent implements OnInit, AfterViewInit, OnDestroy {

    // date format related variables
    systemInformation:ISystemInfo;

  showPriResource = false;
  showsecResource = false;

  // utt
  isPrResourceEnable = false;
  isSecResourceEnable = false;
  hideCustomerDetails: boolean = false;

  @Input()
  appointmentInfo: any = {};

  userDirection$: Observable<string>;

  @Output()
  onClose = new EventEmitter<boolean>();

  @Output()
  onCardClick = new EventEmitter<any>();

  @Input() public useCalendarEndpoint: boolean;

  @Input()
  @HostBinding('class.qm-appointment-info-host--wide-card')
  useWideCard: boolean  = false;

  subscriptions: Subscription = new Subscription();

  constructor(private elementRef: ElementRef,
    public userSelectors: UserSelectors,
    public systemInfoSelectors: SystemInfoSelectors,
    private servicePointSelectors: ServicePointSelectors) { }

  ngOnInit() {
    this.userDirection$ = this.userSelectors.userDirection$;
    setTimeout(() => {
      document.getElementById('app-info-close').focus();
    }, 100);
    
    const systemInfoSubscription = this.systemInfoSelectors.systemInfo$.subscribe(systemInfo=>{
      this.systemInformation = systemInfo;
    });

    this.subscriptions.add(systemInfoSubscription);

    const uttSubscription = this.servicePointSelectors.uttParameters$.subscribe(
      uttParameters => {
        if (uttParameters) {
          this.isPrResourceEnable = uttParameters.primaryResource;
          this.isSecResourceEnable = uttParameters.secondaryResource;
          this.hideCustomerDetails = uttParameters.hideCustomerDetails;
        }
      }
    );
    this.subscriptions.add(uttSubscription);
  }

  getShowPriResource(): boolean {
    return this.isPrResourceEnable && this.appointmentInfo?.resourceServiceDecorators?.[0]?.primaryResource;
  }

  getShowSecResource(): boolean {
    return this.isSecResourceEnable
    && this.appointmentInfo?.resourceServiceDecorators?.[0]?.secondaryResources?.length;
  }

  ngAfterViewInit() {
    /* let infoCardElement = this.elementRef.nativeElement;

    if (infoCardElement) {
      infoCardElement.scrollIntoView();
    } */
  }

  onModalClick() {
    this.onClose.emit(true);
    setTimeout(() => {
      if(document.getElementById('qm-more-info')) {
        document.getElementById('qm-more-info').focus();
      }
    }, 200);
  }

  cardClick() {
    //this.onCardClick.emit(this.appointmentInfo);
    
  }
  
  onCustomerNameClick() {
    this.onCardClick.emit(this.appointmentInfo);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
  URIDecorder(val) {
    try {
      return decodeURIComponent(val);
    }
    catch(err) {
      return (val);
    }
  }
}
