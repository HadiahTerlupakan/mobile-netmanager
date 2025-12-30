/**
 * Alert helper - wraps React Native Alert for testability
 */
import { Alert as RNAlert } from 'react-native';

export const showAlert = (title: string, message?: string) => {
  RNAlert.alert(title, message);
};

export default { showAlert };
