import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import * as moment from 'moment';
import * as _ from 'underscore';

export interface CalendarDate {
  mDate: moment.Moment;
  selected?: boolean;
  today?: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'qm-calendar',
  templateUrl: './qm-calendar.component.html',
  styleUrls: ['./qm-calendar.component.scss']
})
export class QmCalendarComponent implements OnInit, OnChanges {

  currentDate = moment();
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weeks: CalendarDate[][] = [];
  sortedDates: CalendarDate[] = [];

  @Input() selectedDates: CalendarDate[] = [];
  @Input() multiSelect: boolean;
  @Output() onSelectDate = new EventEmitter<CalendarDate>();
  @Input() enabledDates: moment.Moment[] = [];

  private _currentCalendarDates: CalendarDate[] = [];

  constructor() { }

  ngOnInit(): void {
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes.selectedDates &&
      changes.selectedDates.currentValue &&
      changes.selectedDates.currentValue.length > 1) || (changes.enabledDates.currentValue.length > 0)) {
      // sort on date changes for better performance when range checking

      if(changes.selectedDates) {
        this.sortedDates = _.sortBy(changes.selectedDates.currentValue, (m: CalendarDate) => m.mDate.valueOf());
      }
      this.generateCalendar();
    }
  }

  // date checkers

  isToday(date: moment.Moment): boolean {
    return moment().isSame(moment(date), 'day');
  }

  isSelected(date: moment.Moment): boolean {
    return _.findIndex(this.selectedDates, (selectedDate) => {
      return moment(date).isSame(selectedDate.mDate, 'day');
    }) > -1;
  }

  isSelectedMonth(date: moment.Moment): boolean {
    return moment(date).isSame(this.currentDate, 'month');
  }

  selectDate(date: CalendarDate): void {
    if(date.disabled) {
      return;
    }
    this.onSelectDate.emit(date);

    if (!this.multiSelect) {
      this._currentCalendarDates.forEach(d => {
        d.selected = false;
      });
      
      date.selected = true;
      //this.selectedDates.push(date);
    }
  }

  // actions from calendar

  prevMonth(): void {
    this.currentDate = moment(this.currentDate).subtract(1, 'months');
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentDate = moment(this.currentDate).add(1, 'months');
    this.generateCalendar();
  }

  firstMonth(): void {
    this.currentDate = moment(this.currentDate).startOf('year');
    this.generateCalendar();
  }

  lastMonth(): void {
    this.currentDate = moment(this.currentDate).endOf('year');
    this.generateCalendar();
  }

  prevYear(): void {
    this.currentDate = moment(this.currentDate).subtract(1, 'year');
    this.generateCalendar();
  }

  nextYear(): void {
    this.currentDate = moment(this.currentDate).add(1, 'year');
    this.generateCalendar();
  }

  // generate the calendar grid

  generateCalendar(): void {
    const dates = this.fillDates(this.currentDate);
    const weeks: CalendarDate[][] = [];
    while (dates.length > 0) {
      weeks.push(dates.splice(0, 7));
    }
    this.weeks = weeks;
  }

  isDisabledDay(d: moment.Moment) {
    let isDisabled = true;
    this.enabledDates.forEach(ed => {
      if(ed.isSame(d, 'day')){
        isDisabled = false;
      }
    });

    return isDisabled;
  }

  fillDates(currentMoment: moment.Moment): CalendarDate[] {
    this._currentCalendarDates = [];
    const firstOfMonth = moment(currentMoment).startOf('month').day();
    const firstDayOfGrid = moment(currentMoment).startOf('month').subtract(firstOfMonth, 'days');
    const start = firstDayOfGrid.date();
    return _.range(start, start + 42)
      .map((date: number): CalendarDate => {
        const d = moment(firstDayOfGrid).date(date);

        const isSelectedDay = this.isSelected(d);
        
        let calDay = {
          today: this.isToday(d),
          selected: isSelectedDay,
          disabled: this.isDisabledDay(d),
          mDate: d,
        };

        if(isSelectedDay) {
          this.selectDate(calDay);
        }

        this._currentCalendarDates.push(calDay);
        return calDay;
      });
  }
}