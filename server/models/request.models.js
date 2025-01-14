import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
import Tenant from './tenant.models.js';
import Room from './room.models.js';
import Establishment from './establishment.models.js';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, {
  host: process.env.DATABASE_HOST,
  dialect: 'mysql', 
});

const Request = sequelize.define('Request', {
    request_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    tenant_id: {
        type: Sequelize.INTEGER,
        field: 'tenant_id',
        allowNull: false,
        references: {
            model: Tenant,
            key: 'tenant_id'
        },
        onDelete: 'CASCADE'
    },
    room_id: {
        type: DataTypes.INTEGER,
        field: 'room_id',
        allowNull: false,
        references: {
            model: Room,
            key: 'room_id'
        },
        onDelete: 'CASCADE'
    },
    visitorName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    visitorAffiliation: {  
        type: DataTypes.STRING,
        allowNull: true,
    },
    contactInfo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    purpose: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    visitDateFrom: {  
        type: DataTypes.DATE,
        allowNull: false
    },
    visitDateTo: { 
        type: DataTypes.DATE,
        allowNull: false
    },
    visitType: {  
        type: DataTypes.ENUM(
            'regular',
            'overnight'
        ),
        allowNull: false,
        defaultValue: 'regular'
    },
    status: {
        type: DataTypes.ENUM(
            'pending',
            'approved',
            'rejected',
            'cancelled'
        ),
        allowNull: false,
        defaultValue: 'pending'
    },
    adminComments: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    requestDate: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    },
    decisionTimestamp: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    checkin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    establishment_id: { 
        type: Sequelize.INTEGER,
        field: 'establishment_id', 
        references: {
            model: 'Establishment',
            key: 'establishment_id'
        },
        allowNull: false,
        onDelete: 'CASCADE'
    }
}, { timestamps: false });

Request.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Request.belongsTo(Room, { foreignKey: 'room_id' });
Request.belongsTo(Establishment, { foreignKey: 'establishment_id' });

sequelize.sync()
  .then(() => {
    console.log('Requests table has been updated.');
  })
  .catch(err => console.error('Error updating table:', err));

export default Request;
