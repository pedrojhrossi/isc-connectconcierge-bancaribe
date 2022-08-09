import { interval } from 'rxjs';
import { ServicePointSelectors, QueueDispatchers } from './../store/services';
import { Injectable } from '@angular/core';
import cssVars from 'css-vars-ponyfill';
import { Validators } from '@angular/forms';
import { BLOCKED_ERROR_CODES } from 'src/app/shared/error-codes';

@Injectable()
export class Util {

    qrCodeListnerTimer: any;
    public qrRelatedData: any;
    private _refreshUrl: string;
    countryCode: string = undefined;
    identificationNumberRegEx: any;
    phoneRegEx: any;
    constructor(private servicePointSelectors: ServicePointSelectors) {
        window['x'] = this.setSelectedApplicationTheme.bind(this);

    }

    isBlockedErrorCode(errorCode) {
        if (Object.values(BLOCKED_ERROR_CODES).includes(errorCode)) {
          return true;
        } else {
          return false;
        }
      }

    compareVersions(baseVersion, currentVersion) {
        var a = baseVersion.split('.')
            , b = currentVersion.split('.')
            , i = 0, len = Math.max(a.length, b.length);

        for (; i < len; i++) {
            if ((a[i] && !b[i] && parseInt(a[i]) > 0) || (parseInt(a[i]) > parseInt(b[i]))) {
                return 1;
            } else if ((b[i] && !a[i] && parseInt(b[i]) > 0) || (parseInt(a[i]) < parseInt(b[i]))) {
                return -1;
            }
        }
        return 0;
    }

    setDefaultApplicationTheme() {
        this.setApplicationTheme(null);
    }

    setSelectedApplicationTheme() {
        this.servicePointSelectors.openServicePoint$.subscribe((sp) => {
            this.setApplicationTheme(sp);
        }).unsubscribe();
    }

    setApplicationTheme(servicePoint) {
        let themeColor = '#a9023a';

        if (servicePoint) {
            themeColor = servicePoint.parameters.highlightColor;
            if (themeColor == "customized") {
                themeColor = servicePoint.parameters.customizeHighlightColor;
            }
        }

        //set color for app theme custom property
        if (themeColor) {
            let styles: any = getComputedStyle(document.documentElement);
            document.documentElement.style.setProperty('--app-theme', themeColor);

            //IE fix
            if (!(window["CSS"] && CSS.supports('color', 'var(--primary)'))) {
                setTimeout(() => {
                    cssVars({
                        onlyVars: true,
                        preserve: true,
                        variables: {
                            'app-theme': themeColor
                        }
                    });
                }, 0);
            }
        }

    }

    replaceCharcter(value: string) {
        return value.replace(/^\s+|\s+$/g, "").replace(/\n/g, "\\n").replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    }

    buildPhoneNumber(number: string) {
        // return number.replace("+", "");
        return number;
    }

    phoneNoRegEx() {
        // const phoneRegex = `\\(?\\+?\d?[-\s()0-9]{6,}$`
        // if (this.countryCode == undefined ) {
        //     const uttSubscription = this.servicePointSelectors.uttParameters$
        //     .subscribe(uttParameters => {
        //       if (uttParameters) {
        //         this.countryCode = uttParameters.countryCode;
        //       }
        //     })
        //     .unsubscribe();
        // }

        // var phonePrefiForRegex;
        // if (this.countryCode !== '') {
        //   phonePrefiForRegex = this.countryCode.toString().replace('+', '\\\+');
        // }
        // var phoneValidators;
        // if (phonePrefiForRegex) {
        //     phoneValidators = phoneRegex + '|^' + phonePrefiForRegex;
        //   } else {
        //     phoneValidators = phoneRegex;
        //   }

        return /^(041[2|4|6]|042[4|6])\d{7}$/;
    }

    emailRegEx() {
        return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    }

    numberRegEx() {
        return /^[0-9]*$/;
    }
    //* PJHR
    // JLVO 18-1-19 || Se arma Expresion Regular para validar que los caracteres del RFC esten correctos
    rfcRegEx(){
      const uttSubscription = this.servicePointSelectors.uttParameters$
      .subscribe(uttParameters => {
        if (uttParameters) {
          this.identificationNumberRegEx = uttParameters.identificationNumberRegEx;
        }
      })
      .unsubscribe();

      return this.identificationNumberRegEx;
    }

    rfcValidator(){
      return Validators.pattern(this.rfcRegEx());
    }

    phoneNoValidator() {
        const uttSubscription = this.servicePointSelectors.uttParameters$
            .subscribe(uttParameters => {
              if (uttParameters) {
                this.phoneRegEx = uttParameters.phoneRegEx;
              }
            })
            .unsubscribe();

        // if (this.countryCode == undefined ) {
        //     const uttSubscription = this.servicePointSelectors.uttParameters$
        //     .subscribe(uttParameters => {
        //       if (uttParameters) {
        //         this.countryCode = uttParameters.countryCode;
        //       }
        //     })
        //     .unsubscribe();
        // }

        // var phonePrefiForRegex;
        // if (this.countryCode !== '') {
        //   phonePrefiForRegex = this.countryCode.toString().replace('+', '\\\+');
        // }
        var phoneValidators;
        // if (phonePrefiForRegex) {
        //   phoneValidators = [Validators.pattern( phoneRegex + '|^' + phonePrefiForRegex)];
        // } else {
          phoneValidators = [Validators.pattern( this.phoneRegEx )];
        // }
        return phoneValidators;
    }

    emailValidator() {
        return [Validators.pattern(this.emailRegEx())];
    }

    numberValidator() {
        return Validators.pattern(this.numberRegEx());
    }

    getLocaleDate(dateString: string) {
        var date = new Date(dateString);
        var timeOffset = date.getTimezoneOffset();

        var timeStamp = date.getTime() + (timeOffset * 60000);
        var localeDate = new Date(timeStamp);
        var localeTimeFormat = localeDate.toLocaleTimeString();
        var localeFormat = localeDate.toLocaleString();

        var gmtIndex = localeFormat.indexOf('+');
        if (gmtIndex < 0) {
            gmtIndex = localeFormat.indexOf('-');
        }
        var timePortion = localeTimeFormat;
        if (gmtIndex != -1) {
            timePortion = localeTimeFormat.split(" ")[0];
        }

        var secondsIndex = timePortion.lastIndexOf(":");
        var modifyTime = timePortion.substring(0, secondsIndex);

        var modifyDate = localeFormat.replace(localeTimeFormat, modifyTime);

        return modifyDate;
    }

    setRefreshUrl(value: string) {
        this._refreshUrl = value;
    }

    getRefreshUrl() {
        return this._refreshUrl;
    }

    qWebBookIdConverter(value: string) {
        if (value.length > 4) {
            return value.substring(0, value.length - 4);
        } else {
            return null;
        }
    }
}
