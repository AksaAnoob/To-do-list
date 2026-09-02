/**
 * StorageManager - LocalStorage persistence and data management
 */
class StorageManager {
    static STORAGE_KEY = 'taskflow_tasks_v1';
    static THEME_KEY = 'taskflow_theme_v1';

    /**
     * Retrieve all stored tasks
     */
    static getTasks() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) {
            return [];
        }
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse tasks from localStorage:', e);
            return [];
        }
    }

    /**
     * Save tasks array to localStorage
     */
    static saveTasks(tasks) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    }

    /**
     * Add a new task object
     */
    static addTask(taskData) {
        const tasks = this.getTasks();
        const newTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            createdAt: new Date().toISOString(),
            status: taskData.status || 'todo',
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            category: taskData.category || 'General',
            dueDate: taskData.dueDate || '',
            subtasks: taskData.subtasks || []
        };
        tasks.push(newTask);
        this.saveTasks(tasks);
        return newTask;
    }

    /**
     * Update existing task fields
     */
    static updateTask(taskId, updatedFields) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updatedFields };
            this.saveTasks(tasks);
            return tasks[index];
        }
        return null;
    }

    /**
     * Move task to a target column status
     */
    static moveTask(taskId, targetStatus) {
        return this.updateTask(taskId, { status: targetStatus });
    }

    /**
     * Delete a task by ID
     */
    static deleteTask(taskId) {
        let tasks = this.getTasks();
        tasks = tasks.filter(t => t.id !== taskId);
        this.saveTasks(tasks);
    }

    /**
     * Export all tasks as a formatted JSON string
     */
    static exportJSON() {
        const tasks = this.getTasks();
        return JSON.stringify(tasks, null, 2);
    }

    /**
     * Import JSON string into localStorage
     */
    static importJSON(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (Array.isArray(imported)) {
                this.saveTasks(imported);
                return { success: true, count: imported.length };
            }
            return { success: false, error: 'Invalid JSON format (Must be a task array)' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Theme Preference Getter & Setter
     */
    static getTheme() {
        return localStorage.getItem(this.THEME_KEY) || 'dark';
    }

    static setTheme(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
    }

    /**
     * Clear all tasks from localStorage
     */
    static clearAllTasks() {
        this.saveTasks([]);
    }
}
