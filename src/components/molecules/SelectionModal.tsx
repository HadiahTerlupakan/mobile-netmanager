import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useState, useCallback, memo } from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface SelectionItem<T = unknown> {
    id: string;
    label: string;
    subLabel?: string;
    value: T;
}

interface SelectionModalProps<T = unknown> {
    visible: boolean;
    onClose: () => void;
    title: string;
    items: SelectionItem<T>[];
    onSelect: (item: SelectionItem<T>) => void;
    selectedValue?: T;
    loading?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
}

const SelectionItemRow = memo(({
    item,
    isSelected,
    onSelect,
    onClose,
    setSearchQuery
}: {
    item: SelectionItem<any>;
    isSelected: boolean;
    onSelect: (item: SelectionItem<any>) => void;
    onClose: () => void;
    setSearchQuery: (q: string) => void;
}) => (
    <TouchableOpacity
        style={tw`flex-row items-center p-4 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
        onPress={() => {
            onSelect(item);
            onClose();
            setSearchQuery('');
        }}
    >
        <View style={tw`flex-1`}>
            <Text style={tw`text-base font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                {item.label}
            </Text>
            {item.subLabel && (
                <Text style={tw`text-sm text-gray-500 mt-0.5`}>
                    {item.subLabel}
                </Text>
            )}
        </View>
        {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
        )}
    </TouchableOpacity>
));
SelectionItemRow.displayName = 'SelectionItemRow';

export default function SelectionModal<T = unknown>({
    visible,
    onClose,
    title,
    items,
    onSelect,
    selectedValue,
    loading = false,
    searchPlaceholder = 'Cari...',
    emptyText = 'Data tidak ditemukan'
}: SelectionModalProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchQuery) return items;
        const lowerQuery = searchQuery.toLowerCase();
        return items.filter(item =>
            item.label.toLowerCase().includes(lowerQuery) ||
            (item.subLabel && item.subLabel.toLowerCase().includes(lowerQuery))
        );
    }, [items, searchQuery]);

    const renderItem = useCallback(({ item }: { item: SelectionItem<T> }) => (
        <SelectionItemRow
            item={item as any}
            isSelected={selectedValue === item.value}
            onSelect={onSelect as any}
            onClose={onClose}
            setSearchQuery={setSearchQuery}
        />
    ), [selectedValue, onSelect, onClose]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={tw`flex-1 bg-black/50 justify-end`}>
                <View style={tw`bg-white rounded-t-3xl h-[85%] overflow-hidden`}>
                    {/* Header */}
                    <View style={tw`px-4 pt-4 pb-2 border-b border-gray-100`}>
                        <View style={tw`flex-row items-center justify-between mb-4`}>
                            <Text style={tw`text-lg font-bold text-gray-900`}>{title}</Text>
                            <TouchableOpacity onPress={onClose} style={tw`p-1 bg-gray-100 rounded-full`}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5 mb-2`}>
                            <Ionicons name="search" size={20} color="#9CA3AF" />
                            <TextInput
                                style={tw`flex-1 ml-2 text-base text-gray-900`}
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#9CA3AF"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Content */}
                    {loading ? (
                        <View style={tw`flex-1 items-center justify-center`}>
                            <ActivityIndicator size="large" color="#3B82F6" />
                            <Text style={tw`mt-4 text-gray-500`}>Memuat data...</Text>
                        </View>
                    ) : filteredItems.length === 0 ? (
                        <View style={tw`flex-1 items-center justify-center`}>
                            <Ionicons name="search-outline" size={48} color="#E5E7EB" />
                            <Text style={tw`mt-4 text-gray-500`}>{emptyText}</Text>
                        </View>
                    ) : (
                        <FlashList
                            data={filteredItems}
                            renderItem={renderItem}
                            keyExtractor={(item: any) => item.id}
                            estimatedItemSize={60}
                            contentContainerStyle={tw`pb-6`}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}
