import { UserRole } from './../models/UserPermissionsEnum';
import { SUPER_ADMIN_ROLE, CONCIERGE_ROLE, CONNECT_CONCIERGE_ROLE, 
         SERVICEPOINT_ROLE, CALENDAR_ROLE } from './../util/orchestra-roles';

export function userRoleFactory(mods: { modules: string[]}) : UserRole {
        let isVisitUserRole = false;
        let isAppointmentUser = false;
        let isSuperAdminUser = false;

        if (mods.modules.includes(SUPER_ADMIN_ROLE)) {
          isVisitUserRole = true;
          isAppointmentUser = true;
          isSuperAdminUser = true;
        }
        else if (mods.modules.includes(CONCIERGE_ROLE) || mods.modules.includes(CONNECT_CONCIERGE_ROLE)) {
          isVisitUserRole = mods.modules.includes(SERVICEPOINT_ROLE);
          isAppointmentUser = mods.modules.includes(CALENDAR_ROLE);
        }

        let userRole = UserRole.None;
        userRole = isVisitUserRole || isSuperAdminUser ? userRole & UserRole.VisitUserRole : userRole;
        userRole = isAppointmentUser || isSuperAdminUser ? userRole & UserRole.AppointmentUserRole : userRole;
        return userRole;
    }

