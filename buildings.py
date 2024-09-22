import json
from flask_socketio import emit
from datetime import datetime, timedelta

# Load building data
with open('static/data/buildings.json', 'r') as f:
    buildings_data = json.load(f)

def find_available_building(game_state):
    for coords, building in game_state['grid'].items():
        if building['is_built']:  # Only consider built buildings
            for accommodation in building['accommodations']:
                if len(accommodation) < buildings_data[building['type']]['max_people_per_accommodation']:
                    return coords
    return None

def handle_place_building(data, game_state, socketio):
    x, y = data['x'], data['y']
    building_type = data['building_type']
    
    if game_state['money'] >= buildings_data[building_type]['price']:
        construction_time = timedelta(minutes=buildings_data[building_type]['construction_time'])
        game_state['grid'][f"{x},{y}"] = {
            'type': building_type,
            'level': 1,
            'accommodations': [[] for _ in range(buildings_data[building_type]['accommodations'])],
            'total_accommodations': buildings_data[building_type]['accommodations'],
            'construction_start': game_state['current_date'],
            'construction_end': game_state['current_date'] + construction_time,
            'construction_progress': 0,
            'last_maintenance': game_state['current_date'],
            'is_built': False  # Add this line
        }
        game_state['money'] -= buildings_data[building_type]['price']
        game_state['total_accommodations'] += buildings_data[building_type]['accommodations']
        
        socketio.emit('building_placed', {'x': x, 'y': y, 'type': building_type})

def handle_upgrade_building(data, game_state, socketio):
    x, y = data['x'], data['y']
    building = game_state['grid'].get(f"{x},{y}")
    
    if building and building['is_built']:
        building_type = building['type']
        next_level = building['level'] + 1
        upgrade_cost = buildings_data[building_type]['upgrade_cost'] * next_level
        
        if game_state['money'] >= upgrade_cost:
            upgrade_time = timedelta(minutes=buildings_data[building_type]['upgrade_time'])
            building['level'] = next_level
            new_accommodations = buildings_data[building_type]['accommodations']
            building['accommodations'].extend([[] for _ in range(new_accommodations)])
            building['total_accommodations'] += new_accommodations
            game_state['total_accommodations'] += new_accommodations
            game_state['money'] -= upgrade_cost
            
            building['construction_start'] = game_state['current_date']
            building['construction_end'] = game_state['current_date'] + upgrade_time
            building['construction_progress'] = 0
            building['is_built'] = False
            
            socketio.emit('building_upgraded', {'x': x, 'y': y, 'level': next_level})

def update_buildings(game_state, socketio):
    current_date = game_state['current_date']
    for coords, building in game_state['grid'].items():
        if building['construction_progress'] < 1:
            construction_start = building['construction_start'] if isinstance(building['construction_start'], datetime) else datetime.fromisoformat(building['construction_start'])
            construction_end = building['construction_end'] if isinstance(building['construction_end'], datetime) else datetime.fromisoformat(building['construction_end'])
            total_construction_time = (construction_end - construction_start).total_seconds()
            elapsed_time = (current_date - construction_start).total_seconds()
            building['construction_progress'] = min(1, elapsed_time / total_construction_time)
            
            if building['construction_progress'] == 1:
                building['is_built'] = True  # Add this line
                socketio.emit('building_completed', {'x': int(coords.split(',')[0]), 'y': int(coords.split(',')[1])})
        
        # Apply maintenance cost only for built buildings
        if building['is_built']:
            last_maintenance = building['last_maintenance'] if isinstance(building['last_maintenance'], datetime) else datetime.fromisoformat(building['last_maintenance'])
            days_since_maintenance = (current_date - last_maintenance).days
            if days_since_maintenance >= 1:
                maintenance_cost = buildings_data[building['type']]['maintenance_cost'] * building['level'] * days_since_maintenance
                game_state['money'] -= maintenance_cost
                building['last_maintenance'] = current_date

def calculate_city_income(game_state):
    total_income = 0
    for building in game_state['grid'].values():
        if building['is_built']:  # Only consider built buildings
            building_type = building['type']
            building_level = building['level']
            income_per_citizen = buildings_data[building_type]['income_per_citizen']
            total_citizens = sum(len(acc) for acc in building['accommodations'])
            
            # Calculate happiness factor (simplified version)
            happiness_factor = min(1.0, total_citizens / (building['total_accommodations'] * buildings_data[building_type]['max_people_per_accommodation']))
            
            building_income = total_citizens * income_per_citizen * building_level * happiness_factor
            total_income += building_income
    return total_income

def update_city_finances(game_state):
    hourly_income = calculate_city_income(game_state)
    game_state['money'] += hourly_income
