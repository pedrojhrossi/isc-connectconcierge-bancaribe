import { Injectable } from '@angular/core';
import { Action } from '@ngrx/store/src/models';
import { Effect, Actions } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import * as AllActions from './../actions';
import { ServiceDataService } from '../services';
import { AllServiceActions } from './../actions';

const toAction = AllActions.toAction();

@Injectable()
export class ServiceEffects {
    constructor(
      private actions$: Actions,
      private serviceDataService: ServiceDataService
    ) {}

    @Effect()
    getServices$: Observable<Action> = this.actions$
      .ofType(AllActions.FETCH_SERVICES)
      .pipe(
        switchMap((action: AllActions.FetchServices) =>
          toAction(
            this.serviceDataService.getServices(action.payload),
            AllActions.FetchServicesSuccess,
            AllActions.FetchServicesFail
          )
        )
      );
}
