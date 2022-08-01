import { ICustomerProperty } from "./ICustomerProperty";

export interface ICustomer {
  id?: number;
  qpId?: number;
  firstName?: string;
  lastName?: string;
  properties?: ICustomerProperty;
  publicId?: string;
  lastInteractionTimestamp?: string;
  deletionTimestamp?: string;
  retentionPolicy?: string;
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string; //* PJHR
  custom2?: string; //* PJHR
  identificationNumber?: string;
  cardNumber?: string;
  created?: string;
  dob? : string;
}
