import { UID } from '@/utils/UniqueIds';
import { useCallback, useEffect, useState } from 'preact/hooks';


export const useReloadProfile = (profileId: UID) => {

    const [active, setActiveInternal] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    const setActive = useCallback((newValue: boolean) => {
        if(newValue && !loading) {
            // Start loading            

        }

        if(!newValue && loading) {
            // Cancel loading
        }

        setActiveInternal(newValue);
    }, [profileId]);

    // useEffect(() => {



    // }, [profileId]);
    

    return { active, setActive };
}