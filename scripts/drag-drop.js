// Drag and Drop Manager for Matching Questions
export class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.draggedData = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) {
            this.cleanup();
        }
        
        this.bindEvents();
        this.initialized = true;
    }

    cleanup() {
        document.removeEventListener('dragstart', this.handleDragStart);
        document.removeEventListener('dragover', this.handleDragOver);
        document.removeEventListener('drop', this.handleDrop);
        document.removeEventListener('dragend', this.handleDragEnd);
        document.removeEventListener('dragenter', this.handleDragEnter);
        document.removeEventListener('dragleave', this.handleDragLeave);
    }

    bindEvents() {
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
        document.addEventListener('dragenter', this.handleDragEnter.bind(this));
        document.addEventListener('dragleave', this.handleDragLeave.bind(this));

        // Touch events for mobile support
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }

    handleDragStart(e) {
        if (!e.target.classList.contains('draggable-item')) return;

        this.draggedElement = e.target;
        this.draggedData = {
            item: e.target.dataset.item,
            question: e.target.dataset.question
        };

        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(this.draggedData));

        // Create a custom drag image
        this.createDragImage(e);
    }

    handleDragOver(e) {
        const dropZone = this.getDropZone(e.target);
        if (!dropZone) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        const dropZone = this.getDropZone(e.target);
        if (!dropZone) return;

        // Only allow drop if it's the same question
        if (this.draggedData && dropZone.dataset.question === this.draggedData.question) {
            dropZone.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const dropZone = this.getDropZone(e.target);
        if (!dropZone) return;

        // Check if we're actually leaving the drop zone
        const rect = dropZone.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            dropZone.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        
        const dropZone = this.getDropZone(e.target);
        if (!dropZone) return;

        dropZone.classList.remove('drag-over');

        if (!this.draggedElement || !this.draggedData) return;

        // Check if it's the same question
        if (dropZone.dataset.question !== this.draggedData.question) return;

        // Remove any existing item from this drop zone
        const existingItem = dropZone.querySelector('.draggable-item');
        if (existingItem) {
            this.returnToOriginalPosition(existingItem);
        }

        // Add the dragged item to this drop zone
        this.placeDraggedItem(dropZone);
        
        // Add success animation
        dropZone.classList.add('success-animation');
        setTimeout(() => dropZone.classList.remove('success-animation'), 300);
    }

    handleDragEnd(e) {
        if (!e.target.classList.contains('draggable-item')) return;

        e.target.classList.remove('dragging');
        
        // Remove drag-over class from all drop zones
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });

        this.draggedElement = null;
        this.draggedData = null;
    }

    // Touch events for mobile support
    handleTouchStart(e) {
        const target = e.target.closest('.draggable-item');
        if (!target) return;

        e.preventDefault();
        this.touchElement = target;
        this.touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };

        target.classList.add('dragging');
        this.createTouchClone(target, e.touches[0]);
    }

    handleTouchMove(e) {
        if (!this.touchElement || !this.touchClone) return;

        e.preventDefault();
        const touch = e.touches[0];
        
        // Move the clone
        this.touchClone.style.left = (touch.clientX - 50) + 'px';
        this.touchClone.style.top = (touch.clientY - 25) + 'px';

        // Find drop zone under touch
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropZone = this.getDropZone(elementBelow);
        
        // Update visual feedback
        document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('drag-over'));
        if (dropZone && dropZone.dataset.question === this.touchElement.dataset.question) {
            dropZone.classList.add('drag-over');
        }
    }

    handleTouchEnd(e) {
        if (!this.touchElement) return;

        e.preventDefault();
        const touch = e.changedTouches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropZone = this.getDropZone(elementBelow);

        // Clean up
        this.touchElement.classList.remove('dragging');
        document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('drag-over'));
        
        if (this.touchClone) {
            this.touchClone.remove();
            this.touchClone = null;
        }

        // Handle drop
        if (dropZone && dropZone.dataset.question === this.touchElement.dataset.question) {
            const existingItem = dropZone.querySelector('.draggable-item');
            if (existingItem) {
                this.returnToOriginalPosition(existingItem);
            }
            this.placeDraggedItem(dropZone, this.touchElement);
        }

        this.touchElement = null;
        this.touchStartPos = null;
    }

    getDropZone(element) {
        if (!element) return null;
        return element.classList.contains('drop-zone') ? element : element.closest('.drop-zone');
    }

    placeDraggedItem(dropZone, item = this.draggedElement) {
        if (!item || !dropZone) return;

        dropZone.appendChild(item);
        dropZone.classList.add('filled');
        
        // Hide placeholder
        const placeholder = dropZone.querySelector('.placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }

    returnToOriginalPosition(item) {
        const questionIndex = item.dataset.question;
        const originalContainer = document.querySelector(`[data-question-index="${questionIndex}"] .draggable-items`);
        
        if (originalContainer) {
            originalContainer.appendChild(item);
        }
        
        // Update the drop zone it came from
        const currentDropZone = item.closest('.drop-zone');
        if (currentDropZone) {
            currentDropZone.classList.remove('filled');
            const placeholder = currentDropZone.querySelector('.placeholder');
            if (placeholder) {
                placeholder.style.display = 'block';
            }
        }
    }

    createDragImage(e) {
        const dragImage = e.target.cloneNode(true);
        dragImage.style.transform = 'rotate(5deg)';
        dragImage.style.opacity = '0.8';
        document.body.appendChild(dragImage);
        
        e.dataTransfer.setDragImage(dragImage, 50, 25);
        
        // Remove the temporary drag image
        setTimeout(() => {
            if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 0);
    }

    createTouchClone(element, touch) {
        this.touchClone = element.cloneNode(true);
        this.touchClone.style.position = 'fixed';
        this.touchClone.style.pointerEvents = 'none';
        this.touchClone.style.zIndex = '1000';
        this.touchClone.style.opacity = '0.8';
        this.touchClone.style.transform = 'rotate(5deg) scale(1.1)';
        this.touchClone.style.left = (touch.clientX - 50) + 'px';
        this.touchClone.style.top = (touch.clientY - 25) + 'px';
        this.touchClone.style.width = element.offsetWidth + 'px';
        
        document.body.appendChild(this.touchClone);
    }

    // Utility method to reset all matches for a question
    resetMatches(questionIndex) {
        const questionDiv = document.querySelector(`[data-question-index="${questionIndex}"]`);
        if (!questionDiv) return;

        const draggedItems = questionDiv.querySelectorAll('.drop-zone .draggable-item');
        draggedItems.forEach(item => this.returnToOriginalPosition(item));
    }

    // Method to get current matches for validation
    getCurrentMatches(questionIndex) {
        const questionDiv = document.querySelector(`[data-question-index="${questionIndex}"]`);
        if (!questionDiv) return {};

        const matches = {};
        const dropZones = questionDiv.querySelectorAll('.drop-zone');
        
        dropZones.forEach(zone => {
            const draggedItem = zone.querySelector('.draggable-item');
            if (draggedItem) {
                matches[draggedItem.dataset.item] = zone.dataset.target;
            }
        });

        return matches;
    }
}