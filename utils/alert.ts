import { Alert } from 'react-native';

type AlertButton = {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
};

export const AlertService = {
    success: (title: string, message: string) => {
        Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
    },

    error: (title: string, message: string) => {
        Alert.alert(title, message, [{ text: 'OK', style: 'destructive' }]);
    },

    info: (title: string, message: string) => {
        Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
    },

    confirm: (title: string, message: string, onConfirm: () => void) => {
        Alert.alert(title, message, [
            { text: 'Batal', style: 'cancel' },
            { text: 'OK', onPress: onConfirm, style: 'default' }
        ]);
    },

    confirmDestructive: (title: string, message: string, onConfirm: () => void) => {
        Alert.alert(title, message, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', onPress: onConfirm, style: 'destructive' }
        ]);
    },

    custom: (title: string, message: string, buttons: AlertButton[]) => {
        Alert.alert(title, message, buttons as any);
    }
};
