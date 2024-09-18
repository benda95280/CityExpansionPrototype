import random

class Event:
    def __init__(self, name, event_type, interval=None, min_interval=None, max_interval=None):
        self.name = name
        self.event_type = event_type
        self.interval = interval
        self.min_interval = min_interval
        self.max_interval = max_interval
        self.active = True

        if event_type == 'recurring':
            self.next_tick = interval
        elif event_type == 'random':
            self.next_tick = random.randint(min_interval, max_interval)

    def update_next_tick(self, current_tick):
        if self.event_type == 'recurring':
            self.next_tick = current_tick + self.interval
        elif self.event_type == 'random':
            self.next_tick = current_tick + random.randint(self.min_interval, self.max_interval)
    
        # Ensure next_tick is always greater than current_tick
        if self.next_tick <= current_tick:
            self.next_tick = current_tick + 1

    def disable(self):
        self.active = False

    def enable(self):
        self.active = True

    def is_active(self):
        return self.active

    def to_dict(self):
        return {
            'name': self.name,
            'event_type': self.event_type,
            'interval': self.interval,
            'min_interval': self.min_interval,
            'max_interval': self.max_interval,
            'next_tick': self.next_tick,
            'active': self.active
        }

class EventManager:
    def __init__(self):
        self.events = []

    def add_event(self, event):
        self.events.append(event)

    def remove_event(self, event_name):
        self.events = [e for e in self.events if e.name != event_name]

    def get_events(self):
        return self.events

    def get_active_events(self):
        return [e for e in self.events if e.is_active()]

    def update_events(self, current_tick):
        for event in self.get_active_events():
            if current_tick >= event.next_tick:
                yield event
                event.update_next_tick(current_tick)
