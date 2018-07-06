import { Router } from '@angular/router';
import { ISystemInfo } from './../models/ISystemInfo';
import { Observable, Subscription } from 'rxjs';
import { SystemInfoDispatchers } from './../store/services/system-info/system-info.dispatchers';
import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { SystemInfoSelectors, AccountDispatchers, LicenseDispatchers } from '../store';
import { NativeApiService } from 'src/util/services/native-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public systemInformation$: Observable<ISystemInfo>;
  private licenseSubscription: Subscription;
  constructor(private systemInfoDispatchers: SystemInfoDispatchers, private systemInfoSelectors: SystemInfoSelectors,
              private accountDispatchers: AccountDispatchers,
              private licenseDispatchers: LicenseDispatchers, private nativeApiService: NativeApiService,
              private router: Router ) {
  }

  ngOnInit() {
    this.systemInfoDispatchers.fetchSystemInfo();
    this.accountDispatchers.fetchAccountInfo();
  }
}
