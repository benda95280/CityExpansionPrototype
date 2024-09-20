import random
from datetime import datetime, timedelta

class Event:
    def __init__(self, name, event_type, callback, interval=None, min_interval=None, max_interval=None):
        self.name = name
        self.event_type = event_type
        self.callback = callback
        self.interval = interval
        self.min_interval = min_interval
        self.max_interval = max_interval
        self.active = True
        self.next_execution = None
        self.update_next_execution()

    def update_next_execution(self):
        now = datetime.now()
        if self.event_type == 'recurring':
            self.next_execution = now + timedelta(seconds=self.interval)
        elif self.event_type == 'random':
            random_interval = random.randint(self.min_interval, self.max_interval)
            self.next_execution = now + timedelta(seconds=random_interval)

    def execute(self, game_state):
        if callable(self.callback):
            result = self.callback(game_state)
            self.update_next_execution()
            return result
        return None

    def to_dict(self):
        return {
            'name': self.name,
            'event_type': self.event_type,
            'interval': self.interval,
            'min_interval': self.min_interval,
            'max_interval': self.max_interval,
            'next_execution': self.next_execution.isoformat() if self.next_execution else None,
            'active': self.active
        }

class EventManager:
    def __init__(self):
        self.events = []
        self.debug = True

    def add_event(self, event):
        self.events.append(event)
        if self.debug:
            print(f"Event registered: {event.name}")
            print(f"Next occurrence: {event.next_execution}")

    def remove_event(self, event_name):
        self.events = [e for e in self.events if e.name != event_name]

    def get_events(self):
        return self.events

    def get_active_events(self):
        return [e for e in self.events if e.active]

    def set_debug(self, debug):
        self.debug = debug

    def update_events(self, game_state):
        now = datetime.now()
        for event in self.get_active_events():
            if now >= event.next_execution:
                if self.debug:
                    print(f"Event '{event.name}' is going to be fired at {now}")
                yield event

    def to_dict(self):
        return {
            'events': [event.to_dict() for event in self.events]
        }
