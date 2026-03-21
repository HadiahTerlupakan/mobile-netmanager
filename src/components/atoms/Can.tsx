import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { AppFeature } from '@/constants/features';

interface CanProps {
    /**
     * The feature(s) required to show the children.
     * If an array is provided, the user must have ALL features by default.
     */
    I: AppFeature | AppFeature[];
    /**
     * If true, the user only needs to have ONE of the features provided in the array.
     */
    any?: boolean;
    /**
     * Optional role check. If provided, user must also have this role.
     */
    role?: string | string[];
    /**
     * Optional boolean check (e.g. user.isSales).
     */
    pass?: boolean;
    /**
     * Element to show if permission is denied.
     */
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Granular Access Control component for UI masking.
 * Usage:
 * <Can I={AppFeature.WORK_ORDER}>
 *   <Button title="Create Work Order" />
 * </Can>
 */
export const Can: React.FC<CanProps> = ({ 
    I, 
    any = false, 
    role, 
    pass = true, 
    fallback = null, 
    children 
}) => {
    const { user } = useAuth();

    if (!user) return <>{fallback}</>;

    // Super Admin bypass
    if (user.role === 'SUPER_ADMIN') return <>{children}</>;

    // 1. Feature Check
    const features = Array.isArray(I) ? I : [I];
    const userFeatures = user.features || [];
    
    let hasFeature = any 
        ? features.some(f => userFeatures.includes(f))
        : features.every(f => userFeatures.includes(f));

    // 2. Role Check (Optional)
    let roleMatch = true;
    if (role) {
        const roles = Array.isArray(role) ? role : [role];
        roleMatch = roles.includes(user.role);
    }

    // Final visibility check
    const visible = hasFeature && roleMatch && pass;

    if (!visible) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
