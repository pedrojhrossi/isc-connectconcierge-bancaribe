import { IService } from "./IService";

export class ICalendarService extends IService {
    duration: number;
    additionalCustomerDuration: number;
    name: string;
    publicId: string;
    custom: any;
    qpId: number;
    adult?: number;
    child?: number;
    showMoreActionsMostFrequent?:boolean;
    showMoreActions: boolean;
  }
  