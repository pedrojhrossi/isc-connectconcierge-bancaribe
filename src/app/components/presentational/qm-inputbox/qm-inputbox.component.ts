import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { Observable, Subject, Subscription, timer } from 'rxjs';
import { AutoClose } from '../../../../util/services/autoclose.service';
import { UserSelectors, CustomerDispatchers, CustomerDataService, CustomerSelector, ServicePointSelectors, SystemInfoSelectors } from '../../../../store';
import { FormGroup, FormControl, FormBuilder, FormArray, FormGroupDirective, Validators, AbstractControl, } from '@angular/forms';
import { ICustomer } from '../../../../models/ICustomer';
import { debounceTime, first } from '../../../../../node_modules/rxjs/operators';
import { whiteSpaceValidator } from '../../../../util/custom-form-validators';
import { servicePoint, restEndpoint, DataServiceError } from '../../../../store/services/data.service'; //* PJHR
import { Util } from '../../../../util/util';
import { NgOption } from '@ng-select/ng-select';
import { TranslateService } from '@ngx-translate/core';
import { ThrowStmt } from '@angular/compiler';
import { IUTTParameter } from 'src/models/IUTTParameter';
import { LanguageDispatchers, LanguageSelectors } from 'src/store/services/language';
import { ILanguage } from 'src/models/ILanguage';
import { FLOW_TYPE } from 'src/util/flow-state';
import { HttpClient } from '@angular/common/http'; //* PJHR
import { QmModalService } from '../qm-modal/qm-modal.service'; //* PJHR
import { ToastService } from 'src/util/services/toast.service';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';

@Component({
  selector: 'qm-inputbox',
  templateUrl: './qm-inputbox.component.html',
  styleUrls: ['./qm-inputbox.component.scss']
})
export class QmInputboxComponent implements OnInit {
  @Input() flowType: FLOW_TYPE;
  private REST_API_SERVER = `${servicePoint}`;
  customerCreateForm: FormGroup;
  countrycode: string;
  dobRequired: boolean;
  editCustomer: ICustomer;
  editCustomer$: Observable<ICustomer>;
  userDirection$: Observable<string>;
  isButtonPressed: boolean = false;
  customers: ICustomer[];
  customers$: Observable<ICustomer[]>
  private subscriptions: Subscription = new Subscription();
  countryCodeNumber: string;
  day: number;
  controls: any;
  currentCustomer: ICustomer
  editMode: boolean;
  validateRFC:boolean; //* PJHR
  validateDateOfBirth:boolean; //* PJHR
  validId:boolean;
  isExpanded = false;
  isLangExpanded = false;
  dateError = {
    days: '',
    month: ''
  };
  public isLanguageSelectEnabled: boolean = true;
  public dobOrder = { month: 0, day: 1, year: 2 };
  public languages: NgOption[] = [];
  uttParameters$: Observable<IUTTParameter>;
  uttParameters: Observable<IUTTParameter>; //* PJHR
  languages$: Observable<ILanguage[]>;
  supportedLanguagesArray: ILanguage[];
  debouncer: Subject<string> = new Subject(); //* PJHR

  @Output()
  onFlowNext: EventEmitter<any> = new EventEmitter();

  date = {
    day: '',
    month: '',
    year: ''
  };

  isMonthFocus = false;
  isLanguageFocus = false;

  firstName: string

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

  createCustomer = false; //* PJHR

  public months: NgOption[];

  constructor(
    private servicePointSelectors: ServicePointSelectors,
    public autoCloseService: AutoClose,
    private userSelectors: UserSelectors,
    private fb: FormBuilder,
    private customerDispatchers: CustomerDispatchers,
    // private customerDataService:CustomerDataService, //* PJHR
    private http: HttpClient, //* PJHR
    private modalService: QmModalService, //* PJHR
    private customerSelectors: CustomerSelector,
    private util: Util,
    private translateService: TranslateService,
    public LanguageSelectors: LanguageSelectors,
    public languageDispatchers: LanguageDispatchers,
    public systemInfoSelectors: SystemInfoSelectors,
    private toastService: ToastService, //* PJHR
  ) {
    // this.editCustomer$ = this.customerSelectors.editCustomer$;
    this.userDirection$ = this.userSelectors.userDirection$;
    this.languages$ = this.LanguageSelectors.languages$;
  }

  cardNumberChange(cardNumber){
    if(this.createCustomer === false && cardNumber.value.length >= 7){
      let rfcValidated = cardNumber.value.match(this.util.rfcRegEx())
      const cardNumberUppercased = cardNumber.value.toUpperCase();

      if(rfcValidated){
        if(!this.editMode && this.currentCustomer) {
          cardNumberUppercased === this.currentCustomer.properties.externalId.toUpperCase() ? this.validId = true : this.debouncer.next(cardNumberUppercased);
        } else {
          this.debouncer.next(cardNumberUppercased);
        }
      }

    }
  }

  validateId(cardNumber: string) {
    this.http.get(`${this.REST_API_SERVER}/customers;cardNumber=${encodeURIComponent(cardNumber)}`, {observe: 'response'})
    .subscribe(resp => {
        let dataLength = Object.keys(resp.body).length
        let data = resp.body;
        let matchNumber = 0;
        if(dataLength !== 0){
          Object.entries(data).forEach(customer => {
            if (cardNumber === customer[1].properties.externalId.toUpperCase()) {
              matchNumber++;
            }
          })
          matchNumber > 0 ? this.validId = false : this.validId = true;
          if (!this.validId) {
            this.toastService.errorToast("ERROR: Cédula de identidad ya existe");
          }
        } else {
          this.validId = true;
        }
    })
  }

  ngOnInit() {

    //* debouncer PJHR
    this.debouncer.pipe(debounceTime(300)).subscribe((cardNumber)=>{
      this.validateId(cardNumber);
    } )

    // get country code
    const servicePointsSubscription = this.servicePointSelectors.uttParameters$.subscribe((params) => {
      if (params) {
        this.countrycode = params.countryCode;
        this.isLanguageSelectEnabled = params.notificationLanguage;
        this.dobRequired = params.birthdateRequired;
        this.isLanguageSelectEnabled = params.notificationLanguage;
        if (this.isLanguageSelectEnabled) {
          this.languageDispatchers.fetchLanguages();
        }
      }
    });
    this.subscriptions.add(servicePointsSubscription);

    const systemInfoDateSubscription = this.systemInfoSelectors.dateConvention$.subscribe(
      (val: string) => {
        if (val) {
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

    // patch values if current customer available
    const CurrentcustomerSubscription = this.customerSelectors.currentCustomer$.subscribe((customer) => {
      this.currentCustomer = customer;
      if (this.currentCustomer) {
        const dob: any = this.currentCustomer.properties.dateOfBirth;
        this.date = this.formatDate(
          dob.substring(8,10),
          parseInt(dob.substring(5,7)) - 1,
          dob.substring(0,4)
        );


        this.customerCreateForm.patchValue({
          firstName: this.currentCustomer.firstName,
          lastName: this.currentCustomer.lastName,
          phone: this.currentCustomer.properties.phoneNumber,
          externalId:this.currentCustomer.properties.externalId, //* PJHR
          email: this.currentCustomer.properties.email,
          dateOfBirth: {
            month: this.date.month ? this.date.month : null,
            day: this.date.day ? this.date.day : '',
            year: this.date.year ? this.date.year : ''
          },
          language: this.currentCustomer.properties.lang
        })

        //* PJHR
        if(!this.editMode && this.currentCustomer) {
          this.validId = true;
        }

      } else if ((this.customerCreateForm !== undefined) && !this.currentCustomer) {

        this.customerCreateForm.patchValue({
          firstName: '',
          lastName: '',
          phone: this.countrycode,
          externalId: '', //* PJHR
          email: '',
          dateOfBirth: {
            month: null,
            day: '',
            year: ''
          },
          language: ''
        })
      }
    });
    this.subscriptions.add(CurrentcustomerSubscription);

    //TODO UTT Parameters
    //* PJHR
    this.uttParameters = this.servicePointSelectors.uttParameters$;
    const uttSubscription = this.uttParameters
      .subscribe(uttParameters => {
        if (uttParameters) {
          this.validateRFC = uttParameters.validateRFCNumber;
          this.validateDateOfBirth = uttParameters.dateOfBirthSection;
        }
      })
      .unsubscribe();
      this.subscriptions.add(uttSubscription);

    const editModeSubscription = this.customerSelectors.editCustomerMode$.subscribe((status) => {
      this.editMode = status;
    })
    this.subscriptions.add(editModeSubscription);


    // Validators
    const today = new Date();
    const phoneValidators = this.util.phoneNoValidator();
    const emailValidators = this.util.emailValidator();
    let dayValidators = [Validators.maxLength(2), Validators.max(31), Validators.min(1), this.util.numberValidator()];
    let yearValidators = [Validators.maxLength(4), Validators.minLength(4), Validators.max(today.getFullYear()), Validators.min(today.getFullYear() - 125), this.util.numberValidator()];
    let monthValidators = [];
    //* PJHR
    let externalIdValidators = [];
    // JLVO 18-1-19 || Si esta activo en el UTT, Se valida de longitud y RFC
    if(this.validateRFC){
     externalIdValidators = [this.util.rfcValidator(), Validators.required];
   }
    if (this.dobRequired) {
      dayValidators.push(Validators.required);
      yearValidators.push(Validators.required);
      monthValidators.push(Validators.required);
    }
    //subscribe customer List
    const customerSubscription = this.customerSelectors.customer$.subscribe((customer) => this.customers = customer);
    this.subscriptions.add(customerSubscription);

    this.customers$ = this.customerSelectors.customer$;

    // Customer creation form
    this.customerCreateForm = new FormGroup({
      firstName: new FormControl('', Validators.required, whiteSpaceValidator),
      lastName: new FormControl('', Validators.required, whiteSpaceValidator),
      phone: new FormControl(this.countrycode, phoneValidators),
      externalId: new FormControl('V', externalIdValidators),
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
      ),
      language: new FormControl(''),
    })



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

    // Add customer status place country code
    if (this.countrycode && !this.currentCustomer) {
      this.customerCreateForm.patchValue({
        phone: this.countrycode
      })
    }
    else if (this.countrycode && this.currentCustomer && !this.editCustomer.properties.phoneNumber) {
      this.customerCreateForm.patchValue({
        phone: this.countrycode
      })
    }

    let languagesSubscription = this.languages$.subscribe((languages) => {
      this.supportedLanguagesArray = languages;
      if (this.supportedLanguagesArray && (this.languages.length !== languages.length)) {
        this.supportedLanguagesArray = this.supportedLanguagesArray.filter(lang => lang.key !== 'defaultLanguage');
        this.languages = this.supportedLanguagesArray
          .map(language => ({
            value: language.key,
            label: language.value
          }));
        const langChangeSubscription = this.translateService
          .get('label.language.defaultlanguage')
          .subscribe(
            (languageText: string) => {
              this.languages.unshift({ value: '', label: languageText })
            }
          ).unsubscribe();

        this.subscriptions.add(langChangeSubscription);
      }
      if (languages === null) {
        const langChangeSubscription = this.translateService
          .get('label.language.defaultlanguage')
          .subscribe(
            (languageText: string) => {
              this.languages.unshift({ value: '', label: languageText })
            }
          ).unsubscribe();
      }
    })
    this.subscriptions.add(languagesSubscription);
  }

  clearCustomerForm() {
    if (this.customerCreateForm !== undefined) {
      this.customerCreateForm.markAsPristine();
      this.customerCreateForm.controls.dateOfBirth.markAsPristine();

      this.customerCreateForm.patchValue({
        firstName: '',
        lastName: '',
        phone: this.countrycode,
        email: '',
        externalId: '', //* PJHR
        dateOfBirth: {
          month: null,
          day: '',
          year: ''
        },
        language: ''
      });


    }
  }

  public accept() {
    if (this.customerCreateForm.valid) {
      this.createCustomer = true //* PJHR
      if (this.currentCustomer) {
        this.customerDispatchers.updateCustomer(this.preparedCustomer());
        this.customerDispatchers.selectCustomer(this.preparedCustomer());
        this.customerDispatchers.editCustomerMode(false);
      } else {
        this.customerDispatchers.createCustomer(this.trimCustomer());
      }
    }
    this.customerCreateForm.markAsPristine()
  }

  // When customer edit and do not chage (add btn)
  public next() {
    this.customerDispatchers.editCustomerMode(false);
    this.customerCreateForm.markAsPristine()
  }


  trimCustomer(): ICustomer {
    if (this.customerCreateForm.value.phone == this.countrycode) {
      this.customerCreateForm.value.phone = "";
    }
    const customerSave: ICustomer = {
      firstName: this.customerCreateForm.value.firstName.trim(),
      lastName: this.customerCreateForm.value.lastName.trim(),
      properties: this.customerCreateForm.value.language
        ? {
          phoneNumber: this.customerCreateForm.value.phone.trim(),
          email: this.customerCreateForm.value.email.trim(),
          externalId: this.customerCreateForm.value.externalId.toUpperCase().trim(), //* PJHR
          custom2: this.customerCreateForm.value.externalId.toUpperCase().trim(), //* PJHR
          dateOfBirth: this.getDateOfBirth(),
          lang: this.customerCreateForm.value.language,
        }
        : {
          phoneNumber: this.customerCreateForm.value.phone.trim(),
          email: this.customerCreateForm.value.email.trim(),
          dateOfBirth: this.getDateOfBirth(),
          externalId: this.customerCreateForm.value.externalId.toUpperCase().trim(), //* PJHR
          custom2: this.customerCreateForm.value.externalId.toUpperCase().trim(), //* PJHR
        }
    };

    //* PJHR
    customerSave.cardNumber = customerSave.properties.externalId;
    customerSave.properties.custom2 = customerSave.properties.externalId;

    return customerSave
  }


  preparedCustomer(): ICustomer {

    if (this.currentCustomer) {
      //* PJHR
      if (this.currentCustomer.properties.externalId === null &&
        this.currentCustomer.properties.externalId === undefined &&
        this.currentCustomer.properties.externalId === ''){
          const tmpNumber = this.currentCustomer.properties.externalId.substring(1,);
      }
      this.currentCustomer.properties.externalId = this.currentCustomer.properties.externalId.toUpperCase();
      this.currentCustomer.properties.custom2 = this.currentCustomer.properties.externalId.toUpperCase();
      this.editCustomer = this.currentCustomer;
      const customerToSave: ICustomer = {
        ...this.editCustomer,
        ...this.trimCustomer(),
        id: this.editCustomer.id
      }
      return customerToSave
    } else {
      const customerToSave: ICustomer = {
        ...this.trimCustomer()
      }
      return customerToSave
    }

  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  Donothing(event) {
    event.stopPropagation();
  }
  // Date of Birth validation
  isValidDOBEntered(control: FormGroup) {
    let errors = null;
    //* PJHR
    if (this.validateDateOfBirth) {
      if (control.value) {

      // invalid date check for leap year
      if (control.value.year && control.value.month && control.value.day) {
        const d = new Date(
          control.value.year,
          parseInt(control.value.month, 10) - 1,
          control.value.day
        );
        if (new Date() < d) {
          errors = { ...errors, futureDate: true };
        }

        if (d && d.getMonth() + 1 !== parseInt(control.value.month, 10)) {
          control.setErrors({
            invalidDay: true
          });
          errors = { ...errors, invalidDay: true };
        }
      } else if (
        control.value.year ||
        control.value.month ||
        control.value.day
      ) {
        control.setErrors({
          incompleteDay: true
        });
        errors = { ...errors, incompleteDob: true };
      }
    }
    return errors;}
  }
  // restric input feild of birth date and year to numbers
  restrictNumbers($event) {
    const pattern = /[0-9]/;
    const inputChar = String.fromCharCode($event.charCode);

    if (!pattern.test(inputChar)) {
      $event.target.value = $event.target.value.replace(/[^0-9\+\s]/g, '');
      this.customerCreateForm.patchValue({ phone: $event.target.value })
    }
  }

  formatDate(day, month, year) {
    let newDay, newMonth;
    if (day !== '' || day !== undefined) {
      const intDay = parseInt(day, 10);
      newDay = intDay;
      if (intDay < 10) {
        newDay = '0' + intDay;
      }
    }

    if (month !== '' || month !== undefined) {
      const intMonth = parseInt(month, 10) + 1;
      if (intMonth < 10) {
        newMonth = '0' + intMonth;
      } else {
        newMonth = intMonth.toString();
      }
    }

    return {
      day: newDay,
      month: newMonth,
      year: year
    };
  }

  // Format date of birth to be sent in the API
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


  cancel() {
    this.customerDispatchers.resetCurrentCustomer();
    this.customerDispatchers.editCustomerMode(false);
  }

  update() {
    if (
      this.customerCreateForm.valid &&
      (this.currentCustomer.firstName != this.customerCreateForm.value.firstName ||
        this.currentCustomer.lastName != this.customerCreateForm.value.lastName ||
        this.currentCustomer.properties.phoneNumber != this.customerCreateForm.value.phone ||
        this.currentCustomer.properties.email != this.customerCreateForm.value.email ||
        (this.date.year && this.date.year != this.customerCreateForm.value.dateOfBirth.year) ||
        (this.currentCustomer.properties.externalId != this.customerCreateForm.value.externalId ) || //* PJHR
        (this.currentCustomer.properties.custom2 != this.customerCreateForm.value.externalId ) || //* PJHR
        (!this.date.year && this.customerCreateForm.value.dateOfBirth.year) ||
        (this.date.day && this.date.day != this.customerCreateForm.value.dateOfBirth.day) ||
        (!this.date.day && this.customerCreateForm.value.dateOfBirth.year) ||
        this.date.month != this.customerCreateForm.value.dateOfBirth.month) ||
      this.currentCustomer.properties.lang != this.customerCreateForm.value.language
    ) {
      this.accept();
    } else if (this.customerCreateForm.valid && this.customerCreateForm.dirty) {
      this.onFlowNext.emit();
      this.customerCreateForm.markAsPristine();
    }
  }
  discard() {
    this.onFlowNext.emit();
    this.customerCreateForm.markAsPristine()
    this.customerCreateForm.patchValue({
      firstName: this.currentCustomer.firstName,
      lastName: this.currentCustomer.lastName,
      phone: this.currentCustomer.properties.phoneNumber,
      externalId: this.currentCustomer.properties.externalId, //* PJHR
      custom2: this.currentCustomer.properties.externalId, //* PJHR
      email: this.currentCustomer.properties.email,
      dateOfBirth: {
        month: this.date.month ? this.date.month : null,
        day: this.date.day ? this.date.day : '',
        year: this.date.year ? this.date.year : ''
      }
    })

  }

  clearInputFeild(name) {
    this.customerCreateForm.markAsDirty();
    switch (name) {

      case "firstName": this.customerCreateForm.patchValue({ firstName: '' }); break;
      case "lastName": this.customerCreateForm.patchValue({ lastName: '' }); break;
      case "phone": this.customerCreateForm.patchValue({ phone: '' }); break;
      case "email": this.customerCreateForm.patchValue({ email: '' }); break;
      case "externalId": this.customerCreateForm.patchValue({ externalId: '' }); break; //* PJHR

    }
  }
  ScrollToBottom() {
    var searchBox = document.getElementById("birthday_select");
    searchBox.scrollIntoView();

  }
  DropDownStatus(value: boolean) {
    this.isExpanded = value;
  }
  LangDropDownStatus(value: boolean) {
    this.isLangExpanded = value;
  }

  clearDob() {
    this.customerCreateForm.patchValue({
      dateOfBirth: {
        month: null,
        day: '',
        year: ''
      }
    })
    if (this.currentCustomer) {
      this.customerCreateForm.get("dateOfBirth").markAsDirty();
    } else {
      this.customerCreateForm.get("dateOfBirth").markAsPristine();
    }

  }
  monthFiledSelection(value: boolean) {
    this.isMonthFocus = value;
  }
  languageFiledSelection(value: boolean) {
    this.isLanguageFocus = value;
  }
}

