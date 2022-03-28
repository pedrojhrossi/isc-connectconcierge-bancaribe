import { Input } from '@angular/core';
import { Output, EventEmitter } from '@angular/core';
import { QmModalService } from './../qm-modal/qm-modal.service';
import { ServicePointSelectors, UserSelectors} from './../../../../store';
import { OnDestroy } from '@angular/core';
import { Subscription, Subject, Observable } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ICustomer } from 'src/models/ICustomer';

@Component({
  selector: 'qm-notes',
  templateUrl: './qm-notes.component.html',
  styleUrls: ['./qm-notes.component.scss']
})
export class QmNotesComponent implements OnInit, OnDestroy {

  private subscriptions: Subscription = new Subscription();
  private notesInput$: Subject<string> = new Subject<string>();
  private notesLength$: Observable<number>;
  private userDirection$: Observable<string>;
  private notes$: Observable<string>;
  private notesLength: number;
  private notesMaxLength = 255;
  private notesInputOpened = false;
  private buttonPlaceholderText: string;
  notesEnabled: boolean;
  
  
  @Output()
  onNotesChanged: EventEmitter<string> = new EventEmitter<string>();

  @Input()
  notes: string = '';

  @Input()
  flow: string = '';

  @Input()
  isCustomerSelected: ICustomer; 

  constructor(
    private userSelectors: UserSelectors,
    private translateService: TranslateService,
    private servicePointSelectors: ServicePointSelectors,
    private modalService: QmModalService,
  ) {
    this.userDirection$ = this.userSelectors.userDirection$;

  }

  ngOnInit() {
    const notesInputSubscription = this.notesInput$.subscribe(
      (note: string) => this.setNote(note)
    );

   

 
    

    const notesEnabledSettingSubscription = this.servicePointSelectors.uttParameters$.subscribe(uttParameters => {
      if (uttParameters) {
        this.notesEnabled = uttParameters.mdNotes;
        this.notesEnabled = true;
      }
    });

 /*    const notesSubscription = this.notes$.subscribe(
      (notes: string) => (this.notes = notes)
    );

    const notesLengthSubscription = this.notesLength$.subscribe(
      (notesLength: number) => (this.notesLength = notesLength)
    ); */

    const buttonLabelSubscription = this.translateService
      .get('label.notes.presentational.placeholder')
      .subscribe(
        (buttonPlaceholderText: string) =>
          (this.buttonPlaceholderText = buttonPlaceholderText)
      );

    const langChangeSubscription = this.translateService.onLangChange.subscribe(
      () => {
        this.translateService
          .get('label.notes.presentational.placeholder')
          .subscribe(
            (buttonPlaceholderText: string) =>
              (this.buttonPlaceholderText = buttonPlaceholderText)
          ).unsubscribe();
      }
    );

    this.subscriptions.add(notesInputSubscription);
    this.subscriptions.add(notesEnabledSettingSubscription);
  /*   this.subscriptions.add(notesLengthSubscription);
    this.subscriptions.add(notesSubscription); */
    this.subscriptions.add(buttonLabelSubscription);
    this.subscriptions.add(langChangeSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  handleNotesInput(note: string) {
    this.notesInput$.next(note);
  }

  setNote(note: string) {
    //this.appointmentMetaDispatchers.setAppointmentNote(`${note}`);
  }

  hasNotesText() {
    return this.notes && this.notes.trim().length !== 0;
  }

  getButtonText() {
    return this.hasNotesText()
      ? ''
      : this.buttonPlaceholderText;
  }

  hideNotesInput() {
    this.notesInputOpened = false;
  }

  toggleNotesInput() {
    this.notesInputOpened = !this.notesInputOpened;
    var notes = '';
    try {
      notes = decodeURIComponent(this.notes);
    }
    catch(err) {
       notes = this.notes;
    }
    const modal = this.modalService.openNotesModal(notes);
    modal.result.then((value)=> {
      if(value !== null) {
        this.onNotesChanged.emit(value);
      }
    });
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
