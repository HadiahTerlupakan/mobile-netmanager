import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { WorkOrderUpdate } from '@/types/work-order';
import { formatDate } from '@/utils/date';
import { TenantService } from '@/services/TenantService';
import {
  Camera,
  MessageSquare,
  X,
} from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface DiscussionTimelineItem extends WorkOrderUpdate {
  isPhoto?: boolean;
}

interface DiscussionTabProps {
  discussionTimeline: DiscussionTimelineItem[];
  canInteract: boolean;
  isWorkStarted: boolean;
  resolutionNotes: string;
  setResolutionNotes: (s: string) => void;
  photo: string | null;
  handleImageSelection: () => void;
  setPhoto: (s: string | null) => void;
  handleUpdateActivity: () => void;
  isProcessingActivity: boolean;
  openImageViewer: (url: string) => void;
  user: { id?: string } | null;
}

/** Tab Diskusi: chat-style discussion thread + input form */
export const DiscussionTab = React.memo(function DiscussionTab({
  canInteract,
  isWorkStarted,
  resolutionNotes,
  setResolutionNotes,
  photo,
  handleImageSelection,
  setPhoto,
  handleUpdateActivity,
  isProcessingActivity,
  openImageViewer,
  user,
  discussionTimeline,
}: DiscussionTabProps) {
  return (
    <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
      {/* Readonly Banner */}
      {!canInteract && (
        <View style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex-row items-center`}>
          <Text style={tw`text-yellow-700 text-xs flex-1`}>
            {!isWorkStarted
              ? "⚠️ Klik \"Mulai Kerja\" terlebih dahulu untuk mengirim diskusi"
              : "⚠️ Hanya lead teknisi dan partner yang bisa mengirim diskusi"}
          </Text>
        </View>
      )}

      {/* Input Form */}
      <View style={tw`mb-6 ${!canInteract ? "opacity-60" : ""}`}>
        <TextInput
          style={tw`bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm h-20 mb-3`}
          multiline
          textAlignVertical="top"
          placeholder={
            canInteract
              ? "Tulis diskusi..."
              : "Mulai kerja dulu untuk berdiskusi"
          }
          value={resolutionNotes}
          onChangeText={setResolutionNotes}
          editable={canInteract}
        />

        {photo && (
          <View style={tw`mb-3`}>
            <ImageWithCache
              source={photo}
              style={tw`w-24 h-24 rounded-lg`}
              contentFit="cover"
              transition={1000}
            />
            <TouchableOpacity
              onPress={() => setPhoto(null)}
              style={tw`absolute top-1 right-1 bg-black/50 p-1 rounded-full`}
            >
              <X color="white" size={12} />
            </TouchableOpacity>
          </View>
        )}

        <View style={tw`flex-row justify-between items-center mt-2`}>
          <TouchableOpacity
            onPress={() => canInteract && handleImageSelection()}
            disabled={!canInteract}
            style={tw`p-3 rounded-xl items-center justify-center ${canInteract ? "bg-gray-100" : "bg-gray-50"}`}
          >
            <Camera size={20} color={canInteract ? "#4b5563" : "#9ca3af"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => canInteract && handleUpdateActivity()}
            disabled={isProcessingActivity || !canInteract}
            style={tw`px-6 py-3 rounded-xl items-center justify-center shadow-sm ${canInteract ? "bg-blue-600" : "bg-gray-300"}`}
          >
            {isProcessingActivity ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={tw`font-bold text-sm ${canInteract ? "text-white" : "text-gray-500"}`}>
                Kirim
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={tw`h-0.5 bg-gray-100 mb-6`} />

      <Text style={tw`text-xs text-gray-400 font-bold mb-4 uppercase`}>
        Diskusi
      </Text>
      {discussionTimeline.length === 0 ? (
        <View style={tw`items-center justify-center py-8`}>
          <MessageSquare size={32} color="#e5e7eb" style={tw`mb-2`} />
          <Text style={tw`text-center text-gray-400`}>
            Belum ada diskusi
          </Text>
          <Text style={tw`text-center text-gray-300 text-xs`}>
            Mulai percakapan dengan tim
          </Text>
        </View>
      ) : (
        discussionTimeline.map((item) => {
          const creator = item.user || item.createdBy;
          const isMe = creator?.id === user?.id;
          const isPhoto = item.updateType === "PHOTO";

          return (
            <View
              key={`${item.updateType}-${item.id}`}
              style={tw`mb-4 flex-row ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && (
                <View style={tw`w-8 h-8 rounded-full bg-gray-200 items-center justify-center mr-2 self-end mb-1`}>
                  <Text style={tw`font-bold text-gray-600 text-xs`}>
                    {creator?.name?.charAt(0) || "?"}
                  </Text>
                </View>
              )}

              <View style={tw`max-w-[80%]`}>
                <View
                  style={tw`rounded-2xl overflow-hidden ${isPhoto
                    ? ""
                    : isMe
                      ? "bg-blue-600 rounded-tr-none px-4 py-2.5"
                      : "bg-gray-100 rounded-tl-none px-4 py-2.5"
                    }`}
                >
                  {!isMe && !isPhoto && (
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>
                      {creator?.name || "Unknown"}
                    </Text>
                  )}

                  {isPhoto ? (
                    <View>
                      <TouchableOpacity
                        onPress={() => {
                          if (item.filePath) {
                            const imageUrl = item.filePath.startsWith('http')
                              ? item.filePath
                              : `${TenantService.getTenantUrl()}${item.filePath}`;
                            openImageViewer(imageUrl);
                          }
                        }}
                        activeOpacity={0.9}
                      >
                        <ImageWithCache
                          source={
                            item.filePath?.startsWith('http')
                              ? item.filePath
                              : `${TenantService.getTenantUrl()}${item.filePath}`
                          }
                          style={tw`w-48 h-64 bg-gray-200 rounded-lg`}
                          contentFit="cover"
                          transition={1000}
                        />
                      </TouchableOpacity>
                      {item.message && (
                        <View style={tw`bg-black/50 absolute bottom-0 left-0 right-0 p-2`}>
                          <Text style={tw`text-white text-xs`} numberOfLines={2}>
                            {item.message}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={tw`text-sm ${isMe ? "text-white" : "text-gray-800"}`}>
                      {item.message}
                    </Text>
                  )}
                </View>
                <Text
                  style={tw`text-[10px] text-gray-400 mt-1 ${isMe ? "text-right" : "text-left"}`}
                >
                  {formatDate(item.createdAt, "dd MMM HH:mm")}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
});
