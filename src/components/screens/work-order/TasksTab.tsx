import { WorkOrder } from '@/types/work-order';
import {
  CheckSquare,
  ListChecks,
  Square,
} from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface TasksTabProps {
  wo: WorkOrder;
  canInteract: boolean;
  isWorkStarted: boolean;
  handleToggleTask: (taskId: string, status: string) => void;
}

/** Tab Tugas: daftar checklist tugas work order */
export const TasksTab = React.memo(function TasksTab({
  wo,
  canInteract,
  isWorkStarted,
  handleToggleTask,
}: TasksTabProps) {
  return (
    <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
      {/* Readonly Banner */}
      {!canInteract && (
        <View style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex-row items-center`}>
          <Text style={tw`text-yellow-700 text-xs flex-1`}>
            {!isWorkStarted
              ? "⚠️ Klik \"Mulai Kerja\" terlebih dahulu untuk mencentang tugas"
              : "⚠️ Hanya lead teknisi dan partner yang bisa mengubah tugas"}
          </Text>
        </View>
      )}

      <View style={tw`flex-row justify-between items-center mb-4`}>
        <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>
          Daftar Tugas
        </Text>
        <Text style={tw`text-xs text-gray-500`}>
          {wo.tasks?.filter((t) => t.status === "COMPLETED").length || 0}/
          {wo.tasks?.length || 0} Selesai
        </Text>
      </View>

      {wo.tasks && wo.tasks.length > 0 ? (
        wo.tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={tw`flex-row items-center py-3 border-b border-gray-50 last:border-0 ${!canInteract ? "opacity-60" : ""}`}
            onPress={() => canInteract && handleToggleTask(task.id, task.status)}
            disabled={!canInteract}
          >
            <View style={tw`mr-3`}>
              {task.status === "COMPLETED" ? (
                <CheckSquare size={24} color="#10b981" />
              ) : (
                <Square size={24} color="#d1d5db" />
              )}
            </View>
            <View style={tw`flex-1`}>
              <Text
                style={tw`text-sm font-medium ${task.status === "COMPLETED" ? "text-gray-400 line-through" : "text-gray-800"}`}
              >
                {task.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={tw`py-8 items-center justify-center`}>
          <ListChecks size={48} color="#e5e7eb" style={tw`mb-2`} />
          <Text style={tw`text-gray-400 text-center`}>
            Belum ada daftar tugas
          </Text>
        </View>
      )}
    </View>
  );
});
