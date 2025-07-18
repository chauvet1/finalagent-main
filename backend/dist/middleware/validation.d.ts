import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export declare class ValidationError extends Error {
    details: any[];
    statusCode: number;
    constructor(message: string, details: any[], statusCode?: number);
}
export declare const commonSchemas: {
    id: Joi.StringSchema<string>;
    email: Joi.StringSchema<string>;
    password: Joi.StringSchema<string>;
    phone: Joi.StringSchema<string>;
    coordinates: Joi.ObjectSchema<any>;
    dateRange: Joi.ObjectSchema<any>;
    pagination: Joi.ObjectSchema<any>;
};
export declare const authSchemas: {
    login: Joi.ObjectSchema<any>;
    register: Joi.ObjectSchema<any>;
    resetPassword: Joi.ObjectSchema<any>;
    changePassword: Joi.ObjectSchema<any>;
};
export declare const userSchemas: {
    createUser: Joi.ObjectSchema<any>;
    updateUser: Joi.ObjectSchema<any>;
    updateProfile: Joi.ObjectSchema<any>;
};
export declare const locationSchemas: {
    locationUpdate: Joi.ObjectSchema<any>;
    geofenceValidation: Joi.ObjectSchema<any>;
};
export declare const shiftSchemas: {
    createShift: Joi.ObjectSchema<any>;
    updateShift: Joi.ObjectSchema<any>;
    shiftQuery: Joi.ObjectSchema<any>;
};
export declare const incidentSchemas: {
    createIncident: Joi.ObjectSchema<any>;
    updateIncident: Joi.ObjectSchema<any>;
    incidentQuery: Joi.ObjectSchema<any>;
};
export declare const reportSchemas: {
    createReport: Joi.ObjectSchema<any>;
    updateReport: Joi.ObjectSchema<any>;
};
export declare const communicationSchemas: {
    sendMessage: Joi.ObjectSchema<any>;
    createGroup: Joi.ObjectSchema<any>;
};
export declare const fileSchemas: {
    uploadFile: Joi.ObjectSchema<any>;
};
export declare const validateRequest: (schema: Joi.ObjectSchema, target?: "body" | "query" | "params") => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateBody: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateQuery: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateParams: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateIdParam: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validatePagination: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateFileUpload: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
declare const _default: {
    validateRequest: (schema: Joi.ObjectSchema, target?: "body" | "query" | "params") => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateBody: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateQuery: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateParams: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateIdParam: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validatePagination: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
    validateRateLimit: (req: Request, res: Response, next: NextFunction) => void;
    validateFileUpload: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
    commonSchemas: {
        id: Joi.StringSchema<string>;
        email: Joi.StringSchema<string>;
        password: Joi.StringSchema<string>;
        phone: Joi.StringSchema<string>;
        coordinates: Joi.ObjectSchema<any>;
        dateRange: Joi.ObjectSchema<any>;
        pagination: Joi.ObjectSchema<any>;
    };
    authSchemas: {
        login: Joi.ObjectSchema<any>;
        register: Joi.ObjectSchema<any>;
        resetPassword: Joi.ObjectSchema<any>;
        changePassword: Joi.ObjectSchema<any>;
    };
    userSchemas: {
        createUser: Joi.ObjectSchema<any>;
        updateUser: Joi.ObjectSchema<any>;
        updateProfile: Joi.ObjectSchema<any>;
    };
    locationSchemas: {
        locationUpdate: Joi.ObjectSchema<any>;
        geofenceValidation: Joi.ObjectSchema<any>;
    };
    shiftSchemas: {
        createShift: Joi.ObjectSchema<any>;
        updateShift: Joi.ObjectSchema<any>;
        shiftQuery: Joi.ObjectSchema<any>;
    };
    incidentSchemas: {
        createIncident: Joi.ObjectSchema<any>;
        updateIncident: Joi.ObjectSchema<any>;
        incidentQuery: Joi.ObjectSchema<any>;
    };
    reportSchemas: {
        createReport: Joi.ObjectSchema<any>;
        updateReport: Joi.ObjectSchema<any>;
    };
    communicationSchemas: {
        sendMessage: Joi.ObjectSchema<any>;
        createGroup: Joi.ObjectSchema<any>;
    };
    fileSchemas: {
        uploadFile: Joi.ObjectSchema<any>;
    };
};
export default _default;
//# sourceMappingURL=validation.d.ts.map