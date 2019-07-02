import { Observable, Subject, Subscription } from 'rxjs';
import { UserSelectors } from 'src/store';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'qm-done-modal',
  templateUrl: './qm-done-modal.component.html',
  styleUrls: ['./qm-done-modal.component.scss']
})
export class QmDoneModalComponent implements OnInit, OnDestroy {

  heading: string = '';
  subHeading: string = '';
  fieldList: Array<{icon: string, label: string}> = [];
  fieldListHeading: string = '';
  visitID:string;

  userDirection$: Observable<string>;
  userDirection: string;
  subscriptions: Subscription  = new Subscription();

  constructor(public activeModal: NgbActiveModal, private userSelectors: UserSelectors) { }

  ngOnInit() {
    this.userDirection$ = this.userSelectors.userDirection$;
   
    

    const userSubscription = this.userDirection$.subscribe((ud)=> {
      this.userDirection = ud;
    });

    this.subscriptions.add(userSubscription);
    setTimeout(() => {
      if (document.getElementById('qm-modal__headline')){
        document.getElementById('qm-modal__headline').focus();
      }
    }, 100);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
  test(){
  
  }
}
