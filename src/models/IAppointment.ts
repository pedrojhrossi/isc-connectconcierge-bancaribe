import { ICustomer } from './ICustomer';
import { ICalendarBranch } from './ICalendarBranch';
import { ICalendarService } from './ICalendarService';

export interface IAppointment {
  publicId?: string;
  custName?: string;
  servicesDisplayLabel?: string;
  branchDisplayLabel?: string;
  status?: any;
  created?: number;
  updated?: number;
  start?: string;
  startTime?: string;
  numberOfCustomers?: number;
  custom?: string;
  customers?: ICustomer[];
  branch?: ICalendarBranch;
  branchId?: number;
  services?: ICalendarService[];
  title?: string;
  notes?: string;
  allDay?: boolean;
  blocking?: boolean;
  end?: string;
  endTime?: string;
  deleted?: boolean;
  qpId?: number;
  id?: number;
  properties?: {
    notes?: string;
    custom?: string; 
    publicId?: string
  }
  showInfo?: boolean;
  resourceServiceDecorators?: any;
}
