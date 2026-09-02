/**
 * App - Main Controller & Event Bus
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme
    const currentTheme = StorageManager.getTheme();
    document.documentElement.setAttribute('data-theme', currentTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', nextTheme);
            StorageManager.setTheme(nextTheme);
            showToast(`Switched to ${nextTheme.toUpperCase()} mode`);
        });
    }

    // 2. Instantiate TaskModal
    const taskModal = new TaskModal((taskData) => {
        if (taskData.id) {
            StorageManager.updateTask(taskData.id, taskData);
            showToast('Task updated successfully!');
        } else {
            StorageManager.addTask(taskData);
            showToast('New task added!');
        }
        refreshApp();
    });

    // 3. Instantiate Board
    const board = new Board({
        containerEl: document.getElementById('boardGrid'),
        onTaskMove: (taskId, targetStatus) => {
            StorageManager.moveTask(taskId, targetStatus);
            showToast(`Task moved to ${formatStatusName(targetStatus)}`);
            refreshApp();
        },
        onTaskEdit: (task) => {
            taskModal.open(task);
        },
        onTaskDelete: (taskId) => {
            StorageManager.deleteTask(taskId);
            showToast('Task deleted');
            refreshApp();
        }
    });

    // 4. Bind Header Controls
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => taskModal.open(null, 'todo'));
    }

    // Column Quick Add Buttons
    document.querySelectorAll('.btn-quick-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.getAttribute('data-status');
            taskModal.open(null, status);
        });
    });

    // Backup & Restore Dropdown
    const dataMenuBtn = document.getElementById('dataMenuBtn');
    const dataDropdown = document.getElementById('dataDropdown');
    
    if (dataMenuBtn && dataDropdown) {
        dataMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dataDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            dataDropdown.classList.add('hidden');
        });
    }

    // Export Board JSON
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const jsonStr = StorageManager.exportJSON();
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `taskflow_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Board data exported as JSON');
        });
    }

    // Import Board JSON
    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const res = StorageManager.importJSON(evt.target.result);
                if (res.success) {
                    showToast(`Imported ${res.count} tasks!`);
                    refreshApp();
                } else {
                    alert(`Import failed: ${res.error}`);
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    // Clear All Tasks
    const clearTasksBtn = document.getElementById('clearTasksBtn');
    if (clearTasksBtn) {
        clearTasksBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all tasks from the board?')) {
                StorageManager.clearAllTasks();
                showToast('All tasks cleared');
                refreshApp();
            }
        });
    }

    // 5. Search & Filters Event Listeners
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const priorityFilter = document.getElementById('priorityFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortBy = document.getElementById('sortBy');

    const handleFilterChange = () => {
        const query = searchInput.value.trim();
        if (query) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }

        board.setFilters({
            searchQuery: query,
            priority: priorityFilter.value,
            category: categoryFilter.value,
            sortBy: sortBy.value
        });

        const tasks = StorageManager.getTasks();
        board.render(tasks);
    };

    if (searchInput) searchInput.addEventListener('input', handleFilterChange);
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            handleFilterChange();
            searchInput.focus();
        });
    }

    if (priorityFilter) priorityFilter.addEventListener('change', handleFilterChange);
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilterChange);
    if (sortBy) sortBy.addEventListener('change', handleFilterChange);

    // 6. Analytics Dashboard Updater
    function updateAnalytics(tasks) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const progressRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        let overdueCount = 0;
        const now = new Date();
        tasks.forEach(t => {
            if (t.dueDate && t.status !== 'completed') {
                const due = new Date(t.dueDate + 'T23:59:59');
                if (due < now) overdueCount++;
            }
        });

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statCompleted').textContent = completed;
        document.getElementById('statProgress').textContent = `${progressRate}%`;
        document.getElementById('statOverdue').textContent = overdueCount;
    }

    // 7. Global Refresh Function
    function refreshApp() {
        const tasks = StorageManager.getTasks();
        updateAnalytics(tasks);
        board.render(tasks);
    }

    // Toast Notification helper
    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2500);
    }

    function formatStatusName(status) {
        const names = {
            'todo': 'To Do',
            'in-progress': 'In Progress',
            'review': 'Under Review',
            'completed': 'Completed'
        };
        return names[status] || status;
    }

    // Initial Launch
    refreshApp();
});
