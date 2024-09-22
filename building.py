from datetime import datetime, timedelta

class Building:
    def __init__(self, type, level, x, y, construction_start, construction_end):
        self.type = type
        self.level = level
        self.x = x
        self.y = y
        self.accommodations = []
        self.total_accommodations = 0
        self.construction_start = construction_start
        self.construction_end = construction_end
        self.construction_progress = 0
        self.last_maintenance = construction_start
        self.is_built = False

    def update_construction(self, current_date):
        if not self.is_built:
            total_construction_time = (self.construction_end - self.construction_start).total_seconds()
            elapsed_time = (current_date - self.construction_start).total_seconds()
            self.construction_progress = min(1, elapsed_time / total_construction_time)
            
            if self.construction_progress == 1:
                self.is_built = True

    def apply_maintenance(self, current_date, maintenance_cost):
        days_since_maintenance = (current_date - self.last_maintenance).days
        if days_since_maintenance >= 1:
            total_cost = maintenance_cost * self.level * days_since_maintenance
            self.last_maintenance = current_date
            return total_cost
        return 0

    def upgrade(self, upgrade_time, new_accommodations):
        self.level += 1
        self.construction_start = datetime.now()
        self.construction_end = self.construction_start + timedelta(minutes=upgrade_time)
        self.construction_progress = 0
        self.is_built = False
        self.total_accommodations += new_accommodations
        self.accommodations.extend([[] for _ in range(new_accommodations)])

    def add_citizen(self, citizen, max_people_per_accommodation):
        for accommodation in self.accommodations:
            if len(accommodation) < max_people_per_accommodation:
                accommodation.append(citizen)
                return True
        return False

    def to_dict(self):
        return {
            'type': self.type,
            'level': self.level,
            'x': self.x,
            'y': self.y,
            'accommodations': self.accommodations,
            'total_accommodations': self.total_accommodations,
            'construction_start': self.construction_start.isoformat(),
            'construction_end': self.construction_end.isoformat(),
            'construction_progress': self.construction_progress,
            'last_maintenance': self.last_maintenance.isoformat(),
            'is_built': self.is_built
        }

    @classmethod
    def from_dict(cls, data):
        building = cls(
            data['type'],
            data['level'],
            data['x'],
            data['y'],
            datetime.fromisoformat(data['construction_start']),
            datetime.fromisoformat(data['construction_end'])
        )
        building.accommodations = data['accommodations']
        building.total_accommodations = data['total_accommodations']
        building.construction_progress = data['construction_progress']
        building.last_maintenance = datetime.fromisoformat(data['last_maintenance'])
        building.is_built = data['is_built']
        return building
