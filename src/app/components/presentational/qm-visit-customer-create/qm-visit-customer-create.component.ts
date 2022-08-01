import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ICustomer } from '../../../../models/ICustomer';
import { Observable, Subscription } from '../../../../../node_modules/rxjs';
import { CustomerDispatchers, CustomerSelector, ServicePointSelectors, SystemInfoSelectors, UserSelectors } from '../../../../store';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { LocalStorage, STORAGE_SUB_KEY } from '../../../../util/local-storage';
import { TranslateService } from '@ngx-translate/core';
import { ToastService } from '../../../../util/services/toast.service';
import { Util } from '../../../../util/util';
import { NgOption } from '@ng-select/ng-select';

@Component({
  selector: 'qm-visit-customer-create',
  templateUrl: './qm-visit-customer-create.component.html',
  styleUrls: ['./qm-visit-customer-create.component.scss']
})
export class QmVisitCustomerCreateComponent implements OnInit {

  currentCustomer: ICustomer;
  private subscriptions: Subscription = new Subscription();
  customerCreateForm: FormGroup;
  isFlowSkip: boolean = false;
  invalidFirstName: string;
  invalidLastName: string;
  accept: any;
  countryCode: string = '';
  userDirection$: Observable<string>;
  editMode: boolean;
  showToolTip: boolean;
  isExpanded = false;
  skipBranchFocus: boolean = false;
  skipButtonHover: boolean;
  mousePressed: boolean;
  dateError = {
    days: '',
    month: ''
  };

  date = {
    day: '',
    month: '',
    year: ''
  };

  isMonthFocus = false;

  private dateLabelKeys: string[] = [
    'calendar.month.none',
    'calendar.month.january',
    'calendar.month.february',
    'calendar.month.march',
    'calendar.month.april',
    'calendar.month.may',
    'calendar.month.june',
    'calendar.month.july',
    'calendar.month.august',
    'calendar.month.september',
    'calendar.month.october',
    'calendar.month.november',
    'calendar.month.december'
  ];

  public months: NgOption[];
  public dobOrder = { month : 0, day : 1 , year : 2};

  constructor(
    private customerDispatchers: CustomerDispatchers,
    private customerSelectors: CustomerSelector,
    private localStorage: LocalStorage,
    private userSelectors: UserSelectors,
    private translateService: TranslateService,
    private toastService: ToastService,
    private servicePointSelectors: ServicePointSelectors,
    private util: Util,
    private fb: FormBuilder,
    public systemInfoSelectors: SystemInfoSelectors
  ) {

    this.isFlowSkip = localStorage.getSettingForKey(STORAGE_SUB_KEY.CUSTOMER_SKIP);
    this.userDirection$ = this.userSelectors.userDirection$;

    // Assign temp customer to cutsomer object
    const customerSubscription = this.customerSelectors.tempCustomer$.subscribe((customer) => {
      this.currentCustomer = customer;
      if (customer) {
        this.trimCustomer();
      }
    });
    this.subscriptions.add(customerSubscription);

    const systemInfoDateSubscription = this.systemInfoSelectors.dateConvention$.subscribe(
      (val: string) => {
        if(val){
          var objArr = val.split('-');
          if (objArr.length !== 3) {
            objArr = val.split('/');
          }
          this.dobOrder.day = objArr.indexOf('DD');
          this.dobOrder.month = objArr.indexOf('MM');
          this.dobOrder.year = objArr.indexOf('YY');
        }

      }
    );
    this.subscriptions.add(systemInfoDateSubscription);

    const servicePointsSubscription = this.servicePointSelectors.uttParameters$.subscribe((params) => {
      if (params) {
        this.countryCode = params.countryCode;
      }
    });
    this.subscriptions.add(servicePointsSubscription);
  }

  @Output()
  onFlowNext: EventEmitter<any> = new EventEmitter<any>();

  ngOnInit() {
    this.buildCustomerFrom();
    // Add month names to an array
    const translateSubscription = this.translateService
      .get(this.dateLabelKeys)
      .subscribe((dateLabels: string[]) => {
        this.months = [
          { value: '', label: dateLabels['calendar.month.none'] },
          { value: '01', label: dateLabels['calendar.month.january'] },
          { value: '02', label: dateLabels['calendar.month.february'] },
          { value: '03', label: dateLabels['calendar.month.march'] },
          { value: '04', label: dateLabels['calendar.month.april'] },
          { value: '05', label: dateLabels['calendar.month.may'] },
          { value: '06', label: dateLabels['calendar.month.june'] },
          { value: '07', label: dateLabels['calendar.month.july'] },
          { value: '08', label: dateLabels['calendar.month.august'] },
          { value: '09', label: dateLabels['calendar.month.september'] },
          { value: '10', label: dateLabels['calendar.month.october'] },
          { value: '11', label: dateLabels['calendar.month.november'] },
          { value: '12', label: dateLabels['calendar.month.december'] }
        ];
      });

    this.subscriptions.add(translateSubscription);

  }

  buildCustomerFrom() {
    const today = new Date();
    const phoneValidators = this.util.phoneNoValidator();
    const emailValidators = this.util.emailValidator();
    const dayValidators = [Validators.maxLength(2), Validators.max(31), this.util.numberValidator()];
    const yearValidators = [Validators.maxLength(4), Validators.minLength(4), Validators.max(today.getFullYear()), Validators.min(today.getFullYear() - 125), this.util.numberValidator()];
    const monthValidators = [];

    this.customerCreateForm = new FormGroup({
      firstName: new FormControl(''),
      lastName: new FormControl(''),
      phone: new FormControl(this.countryCode, phoneValidators),
      email: new FormControl('', emailValidators),
      dateOfBirth: this.fb.group(
        {
          month: [null, monthValidators],
          day: ['', dayValidators],
          year: ['', yearValidators]
        },
        {
          validator: this.isValidDOBEntered.bind(this)
        }
      )
    })
  }


  // Date of Birth validation
  isValidDOBEntered(control: FormGroup) {
    if (control.value) {
      if (control.value.year && control.value.day && !control.value.month) {
        control.controls['month'].setErrors({ 'incorrect': true });
      } else {
        control.controls['month'].setErrors(null);
      }
      if (control.value.year && control.value.month) {
        const lastDay = new Date(control.value.year, control.value.month, 0).getDate();
        const tempDayValidators = [Validators.maxLength(2), Validators.max(lastDay), this.util.numberValidator()];
        control.controls['day'].setValidators(tempDayValidators);
        if (control.value.day && parseInt(control.value.day, 10) > lastDay) {
          control.controls['day'].setErrors({ 'max': true });
        } else if (control.value.day && parseInt(control.value.day, 10) <= lastDay) {
          control.controls['day'].setErrors(null);
        }

        const selectedMonth = this.months.find(function (item) {
          return item.value === control.value.month;
        });
        this.dateError = {
          days: lastDay.toString(),
          month: selectedMonth.label
        };
      }
    }
  }

  trimCustomer() {
    var phoneNo = this.currentCustomer.phone.trim()
    if (phoneNo === "" || phoneNo === null) {
      phoneNo = this.countryCode;
    }
    this.customerCreateForm.patchValue({
      firstName: this.currentCustomer.firstName.trim(),
      lastName: this.currentCustomer.lastName.trim(),
      email: this.currentCustomer.email.trim(),
      phone: phoneNo,
      dateOfBirth: this.getDateOfBirth()
    });
  }

  getDateOfBirth(): string {
    const formModel = this.customerCreateForm.value;
    let year = String(formModel.dateOfBirth.year);
    const month = formModel.dateOfBirth.month as string;
    let day = formModel.dateOfBirth.day as string;

    if (day && parseInt(day, 10)) {
      const intDay = parseInt(day, 10);
      if (intDay < 10) {
        day = '0' + intDay;
      }
    }
    year = this.leftPadWithZeros(year, 4);
    return year && month && day ? year + '-' + month + '-' + day : '';
  }

  // Add 0 to make the year as 4 digits
  leftPadWithZeros(sourceString, length) {
    while (sourceString.length < length) {
      sourceString = '0' + sourceString;
    }
    return sourceString;
  }

  doneButtonClick() {
    if (this.customerCreateForm.invalid) {
      this.translateService.get('invalied_customer_details').subscribe(v => {
        this.toastService.infoToast(v);
      });
    }
    else {
      if (this.customerCreateForm.value && (this.customerCreateForm.value.firstName && this.customerCreateForm.value.firstName.trim() != '') || (this.customerCreateForm.value.lastName && this.customerCreateForm.value.lastName.trim() != '') || (this.customerCreateForm.value.phone && this.customerCreateForm.value.phone.trim() != '' && this.customerCreateForm.value.phone.trim() != this.countryCode) || (this.customerCreateForm.value.email && this.customerCreateForm.value.email.trim() != '')) {
        this.customerDispatchers.setTempCustomers(this.prepareSaveCustomer());
        this.onFlowNext.emit();
      } else {
        this.customerDispatchers.resetTempCustomer();
        this.customerCreateForm.reset();
        // this.customerDispatchers.resetTempCustomer();
        this.onFlowNext.emit();
      }

    }
  }

  prepareSaveCustomer(): ICustomer {
    const formModel = this.customerCreateForm.value;

    var phoneNo = formModel.phone as string
    if (phoneNo === this.countryCode) {
      phoneNo = '';
    }
    const customer: ICustomer = {
      firstName: formModel.firstName as string,
      lastName: formModel.lastName as string,
      email: formModel.email as string,
      phone: phoneNo,
      dob: formModel.dateOfBirth.year && formModel.dateOfBirth.month && formModel.dateOfBirth.day ?
        (formModel.dateOfBirth.year + '-' + formModel.dateOfBirth.month + '-' + formModel.dateOfBirth.day) as string : null
    };
    console.log(customer);
    // trim trailing spaces
    for (const key in customer) {
      if (customer[key] && customer[key].trim) {
        customer[key] = customer[key].trim();
      }
    }

    return customer;
  }


  onSwitchChange() {
    this.localStorage.setSettings(STORAGE_SUB_KEY.CUSTOMER_SKIP, this.isFlowSkip);
  }

  clearInputFeild(name) {
    this.customerCreateForm.markAsDirty();
    switch (name) {
      case "firstName": this.customerCreateForm.patchValue({ firstName: '' }); break;
      case "lastName": this.customerCreateForm.patchValue({ lastName: '' }); break;
      case "phone": this.customerCreateForm.patchValue({ phone: '' }); break;
      case "email": this.customerCreateForm.patchValue({ email: '' }); break;
    }
  }
  restrictNumbers($event) {
    $event.target.value = $event.target.value.replace(/[^0-9\+\s]/g, '');
    this.customerCreateForm.patchValue({ phone: $event.target.value })
  }
  ScrollToBottom() {
    var searchBox = document.getElementById("birthday_select");
    searchBox.scrollIntoView();

  }
  DropDownStatus(value: boolean) {
    this.isExpanded = value;
  }

  clearDob() {
    this.customerCreateForm.patchValue({
      dateOfBirth: {
        month: null,
        day: '',
        year: ''
      }
    })
    this.customerCreateForm.markAsDirty();
  }

  monthFiledSelection(value: boolean) {
    this.isMonthFocus = value;
  }
}
