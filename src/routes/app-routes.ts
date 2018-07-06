import { QmAppPageNotFoundComponent } from './../app/components/presentational/qm-app-page-not-found/qm-app-page-not-found.component';
import { QmAppComponent } from './../app/components/containers/qm-app/qm-app.component';
import { QmAppLoaderComponent } from './../app/components/containers/qm-app-loader/qm-app-loader.component';
import { AppComponent } from './../app/app.component';
import { RouterModule, Routes } from '@angular/router';
import { LicenseAuthGuard } from 'src/auth-guards/license-auth-guard';
import { QmInvalidLicenseComponent } from 'src/app/components/presentational/qm-invalid-license/qm-invalid-license.component';
export const appRoutes: Routes = [
    {
      path: '',
      children: [
        { path: 'loading', component: QmAppLoaderComponent },
        { path: 'app', component: QmAppComponent, canActivate: [LicenseAuthGuard] },
        { path: 'invalid-license', component: QmInvalidLicenseComponent },
        { path: '**', component: QmAppPageNotFoundComponent}
      ]
    }
  ];
  