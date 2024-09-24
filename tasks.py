import random
from datetime import datetime, timedelta

class Task:
    def __init__(self, name, task_type, is_recurring, callback, min_interval=20000, max_interval=0):
        self.name = name
        self.task_type = task_type
        self.is_recurring = is_recurring
        self.callback = callback
        self.min_interval = min_interval
        self.max_interval = max_interval
        self.active = True
        self.next_execution_tick = None
        self.completion_percentage = 0
        self.last_execution_tick = 0
        self.update_next_execution(0)

    def update_next_execution(self, current_tick):
        if self.task_type == 'classic':
            self.next_execution_tick = current_tick + self.min_interval
        elif self.task_type == 'random':
            random_interval = random.randint(self.min_interval, self.max_interval)
            self.next_execution_tick = current_tick + random_interval
        
        self.completion_percentage = 0
        print(f"Debug: Task '{self.name}' next execution set to tick {self.next_execution_tick}")

    def execute(self, game_state):
        if callable(self.callback):
            print(f"Debug: Executing task '{self.name}' at tick {game_state['tick']}")
            result = self.callback(game_state)
            self.last_execution_tick = game_state['tick']
            self.completion_percentage = 0
            self.update_next_execution(game_state['tick'])
            print(f"Debug: Task '{self.name}' execution complete. Next execution at tick {self.next_execution_tick}")
            return result, not self.is_recurring
        return None, False

    def to_dict(self):
        return {
            'name': self.name,
            'task_type': self.task_type,
            'is_recurring': self.is_recurring,
            'min_interval': self.min_interval,
            'max_interval': self.max_interval,
            'next_execution_tick': self.next_execution_tick,
            'completion_percentage': int(self.completion_percentage),
            'last_execution_tick': self.last_execution_tick
        }

class TaskManager:
    def __init__(self):
        self.tasks = []
        self.debug = True

    def add_task(self, task):
        self.tasks.append(task)
        if self.debug:
            print(f"Task registered: {task.name}")

    def remove_task(self, task_name):
        self.tasks = [t for t in self.tasks if t.name != task_name]

    def get_tasks(self):
        return self.tasks

    def get_active_tasks(self):
        return [t for t in self.tasks if t.active]

    def set_debug(self, debug):
        self.debug = debug

    def update_tasks(self, game_state):
        current_tick = game_state['tick']
        tasks_to_remove = []
        for task in self.get_active_tasks():
            if current_tick >= task.next_execution_tick:
                if self.debug:
                    print(f"Debug: Task '{task.name}' is ready for execution at tick {current_tick}")
                result, should_remove = task.execute(game_state)
                if should_remove:
                    tasks_to_remove.append(task.name)
            else:
                task.completion_percentage = int((current_tick - task.last_execution_tick) / (task.next_execution_tick - task.last_execution_tick) * 100)
                if self.debug:
                    print(f"Debug: Task '{task.name}' progress: {task.completion_percentage}%")
        
        for task_name in tasks_to_remove:
            self.remove_task(task_name)
            if self.debug:
                print(f"Debug: Non-recurring task '{task_name}' removed after execution")

    def to_dict(self):
        return {
            'tasks': [task.to_dict() for task in self.tasks]
        }

    def update_task_completion(self, task_name, completion_percentage):
        for task in self.tasks:
            if task.name == task_name:
                task.completion_percentage = completion_percentage
                break
