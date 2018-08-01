import { ServicePointSelectors } from './../store/services';
import { Injectable } from '@angular/core';
import cssVars from 'css-vars-ponyfill';

@Injectable()
export class Util {
    
    constructor(private servicePointSelectors: ServicePointSelectors) {
        window['x'] = this.setSelectedApplicationTheme.bind(this);
    }

    compareVersions(baseVersion, currentVersion) {
        if (typeof baseVersion + typeof currentVersion != '')
            return -1;

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
        this.servicePointSelectors.openServicePoint$.subscribe((sp)=> {
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
                            onlyVars : true,
                            preserve: true,
                            variables: {
                                'app-theme': themeColor
                            }
                        });
                    }, 0);
                }
            }
        
    }
}
