/**
 * TaskModal - Manages Task Creation and Editing Dialog
 */
class TaskModal {
    constructor(onSaveCallback) {
        this.onSave = onSaveCallback;
        this.currentSubtasks = [];
        this.initDOM();
        this.bindEvents();
    }

    initDOM() {
        this.modalEl = document.getElementById('taskModal');
        this.formEl = document.getElementById('taskForm');
        this.titleEl = document.getElementById('modalTitle');
        this.idInput = document.getElementById('taskId');
        this.titleInput = document.getElementById('taskTitleInput');
        this.descInput = document.getElementById('taskDescInput');
        this.statusInput = document.getElementById('taskStatusInput');
        this.priorityInput = document.getElementById('taskPriorityInput');
        this.categoryInput = document.getElementById('taskCategoryInput');
        this.dueDateInput = document.getElementById('taskDueDateInput');
        
        this.subtasksContainer = document.getElementById('subtasksContainer');
        this.newSubtaskInput = document.getElementById('newSubtaskInput');
        this.addSubtaskBtn = document.getElementById('addSubtaskBtn');

        this.closeBtn = document.getElementById('closeModalBtn');
        this.cancelBtn = document.getElementById('cancelModalBtn');
    }

    bindEvents() {
        // Form submit
        this.formEl.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSave();
        });

        // Close handlers
        this.closeBtn.addEventListener('click', () => this.close());
        this.cancelBtn.addEventListener('click', () => this.close());

        // Backdrop click close
        this.modalEl.addEventListener('click', (e) => {
            if (e.target === this.modalEl) this.close();
        });

        // ESC key close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modalEl.classList.contains('hidden')) {
                this.close();
            }
        });

        // Subtask add button & Enter key
        this.addSubtaskBtn.addEventListener('click', () => this.addSubtaskFromInput());
        this.newSubtaskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addSubtaskFromInput();
            }
        });
    }

    /**
     * Open Modal for Create or Edit
     */
    open(task = null, defaultStatus = 'todo') {
        this.formEl.reset();
        this.currentSubtasks = [];

        if (task) {
            // Edit Mode
            this.titleEl.textContent = 'Edit Task';
            this.idInput.value = task.id;
            this.titleInput.value = task.title || '';
            this.descInput.value = task.description || '';
            this.statusInput.value = task.status || 'todo';
            this.priorityInput.value = task.priority || 'medium';
            this.categoryInput.value = task.category || '';
            this.dueDateInput.value = task.dueDate || '';
            this.currentSubtasks = task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [];
        } else {
            // Create Mode
            this.titleEl.textContent = 'Create New Task';
            this.idInput.value = '';
            this.statusInput.value = defaultStatus;
            this.priorityInput.value = 'medium';
        }

        this.renderSubtasks();
        this.modalEl.classList.remove('hidden');
        setTimeout(() => this.titleInput.focus(), 100);
    }

    close() {
        this.modalEl.classList.add('hidden');
    }

    /**
     * Subtask Items Rendering and Logic
     */
    addSubtaskFromInput() {
        const val = this.newSubtaskInput.value.trim();
        if (!val) return;

        this.currentSubtasks.push({
            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            title: val,
            completed: false
        });

        this.newSubtaskInput.value = '';
        this.renderSubtasks();
    }

    renderSubtasks() {
        this.subtasksContainer.innerHTML = '';

        if (this.currentSubtasks.length === 0) {
            this.subtasksContainer.innerHTML = `<div class="subtask-hint" style="padding: 0.25rem 0;">No subtasks added yet.</div>`;
            return;
        }

        this.currentSubtasks.forEach((st, idx) => {
            const row = document.createElement('div');
            row.className = 'subtask-item-row';
            row.innerHTML = `
                <input type="checkbox" class="subtask-checkbox" ${st.completed ? 'checked' : ''} data-index="${idx}">
                <input type="text" class="subtask-input-text ${st.completed ? 'completed' : ''}" value="${this.escapeHTML(st.title)}" data-index="${idx}">
                <button type="button" class="btn-remove-subtask" data-index="${idx}" title="Remove subtask">&times;</button>
            `;

            // Toggle subtask completed
            row.querySelector('.subtask-checkbox').addEventListener('change', (e) => {
                this.currentSubtasks[idx].completed = e.target.checked;
                this.renderSubtasks();
            });

            // Edit subtask text inline
            row.querySelector('.subtask-input-text').addEventListener('input', (e) => {
                this.currentSubtasks[idx].title = e.target.value;
            });

            // Remove subtask
            row.querySelector('.btn-remove-subtask').addEventListener('click', () => {
                this.currentSubtasks.splice(idx, 1);
                this.renderSubtasks();
            });

            this.subtasksContainer.appendChild(row);
        });
    }

    handleSave() {
        const title = this.titleInput.value.trim();
        if (!title) return;

        const taskData = {
            id: this.idInput.value || null,
            title,
            description: this.descInput.value.trim(),
            status: this.statusInput.value,
            priority: this.priorityInput.value,
            category: this.categoryInput.value.trim() || 'General',
            dueDate: this.dueDateInput.value,
            subtasks: this.currentSubtasks.filter(st => st.title.trim().length > 0)
        };

        if (typeof this.onSave === 'function') {
            this.onSave(taskData);
        }

        this.close();
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }
}
