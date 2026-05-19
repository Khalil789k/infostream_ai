import threading
import queue
import time
import uuid
import logging
from flask import current_app

logger = logging.getLogger(__name__)

class ProcessingQueueManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                cls._instance = super(ProcessingQueueManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, app=None):
        if self._initialized:
            return
        self.app = app
        self.tasks = {}  # task_id -> task_info
        self.task_queue = queue.Queue()
        self.worker_thread = None
        self._stop_worker = False
        self._initialized = True
        
        if app:
            self.start_worker(app)

    def start_worker(self, app):
        self.app = app
        self._stop_worker = False
        if not self.worker_thread or not self.worker_thread.is_alive():
            self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
            self.worker_thread.start()
            logger.info("Processing queue worker thread started.")

    def add_task(self, user_id, task_type, target_fn, *args, **kwargs):
        from flask import current_app
        self.start_worker(current_app._get_current_object())
        
        task_id = str(uuid.uuid4())
        task_info = {
            'id': task_id,
            'user_id': user_id,
            'task_type': task_type,
            'status': 'queued',  # queued, processing, completed, failed, cancelled
            'target_fn': target_fn,
            'args': args,
            'kwargs': kwargs,
            'error': None,
            'result': None,
            'created_at': time.time(),
            'started_at': None,
            'completed_at': None,
            'last_heartbeat': time.time()
        }
        self.tasks[task_id] = task_info
        self.task_queue.put(task_id)
        logger.info(f"Added task {task_id} of type {task_type} for user {user_id} to queue.")
        return task_id

    def get_task_status(self, task_id):
        from flask import current_app
        self.start_worker(current_app._get_current_object())
        
        # Update heartbeat when client polls
        task = self.tasks.get(task_id)
        if not task:
            return None
        
        task['last_heartbeat'] = time.time()
        
        # Calculate queue position
        position = -1
        if task['status'] == 'queued':
            queue_list = list(self.task_queue.queue)
            try:
                position = queue_list.index(task_id) + 1
            except ValueError:
                position = 1  # next up
                
        return {
            'id': task['id'],
            'status': task['status'],
            'task_type': task['task_type'],
            'position': position,
            'error': task['error'],
            'result': task['result'],
            'created_at': task['created_at'],
            'started_at': task['started_at'],
            'completed_at': task['completed_at']
        }

    def cancel_task(self, task_id):
        from flask import current_app
        self.start_worker(current_app._get_current_object())
        
        task = self.tasks.get(task_id)
        if not task:
            return False
        
        if task['status'] in ('queued', 'processing'):
            task['status'] = 'cancelled'
            task['completed_at'] = time.time()
            logger.info(f"Task {task_id} was marked as CANCELLED.")
            
            # Physically remove the task_id from the underlying queue deque if present
            try:
                with self.task_queue.mutex:
                    if task_id in self.task_queue.queue:
                        self.task_queue.queue.remove(task_id)
                        logger.info(f"Task {task_id} successfully removed from the task queue.")
            except Exception as e:
                logger.error(f"Error removing task from queue list: {e}")
                
            return True
        return False

    def check_heartbeats(self, timeout=25.0):
        """Cancel tasks whose clients stopped polling."""
        now = time.time()
        for task_id, task in list(self.tasks.items()):
            if task['status'] in ('queued', 'processing'):
                if now - task['last_heartbeat'] > timeout:
                    logger.warning(f"Task {task_id} missed heartbeat (last active {now - task['last_heartbeat']:.1f}s ago). Cancelling.")
                    self.cancel_task(task_id)

    def _worker_loop(self):
        # We need the Flask application context to access database and configs
        with self.app.app_context():
            while not self._stop_worker:
                try:
                    # Periodically check client heartbeats/inactivity
                    self.check_heartbeats()
                    
                    # Fetch next task from queue with a 2-second timeout
                    try:
                        task_id = self.task_queue.get(timeout=2.0)
                    except queue.Empty:
                        continue
                    
                    task = self.tasks.get(task_id)
                    if not task or task['status'] == 'cancelled':
                        self.task_queue.task_done()
                        continue
                    
                    # Double-check heartbeat before executing
                    if time.time() - task['last_heartbeat'] > 25.0:
                        task['status'] = 'cancelled'
                        self.task_queue.task_done()
                        continue
                    
                    # Update status to processing
                    task['status'] = 'processing'
                    task['started_at'] = time.time()
                    logger.info(f"Task {task_id} of type {task['task_type']} is now PROCESSING.")
                    
                    try:
                        fn = task['target_fn']
                        # Execute processing
                        result = fn(*task['args'], **task['kwargs'])
                        
                        # Re-verify status to check if it was cancelled DURING execution
                        task = self.tasks.get(task_id)
                        if task['status'] == 'cancelled':
                            logger.info(f"Task {task_id} finished but was already CANCELLED. Discarding result.")
                        else:
                            task['status'] = 'completed'
                            task['result'] = result
                            task['completed_at'] = time.time()
                            logger.info(f"Task {task_id} COMPLETED successfully.")
                            
                    except Exception as e:
                        logger.error(f"Error processing task {task_id}: {e}", exc_info=True)
                        task = self.tasks.get(task_id)
                        if task['status'] != 'cancelled':
                            task['status'] = 'failed'
                            task['error'] = str(e)
                            task['completed_at'] = time.time()
                            
                    finally:
                        self.task_queue.task_done()
                        
                except Exception as e:
                    logger.error(f"Exception in worker loop: {e}", exc_info=True)
                    time.sleep(2)
