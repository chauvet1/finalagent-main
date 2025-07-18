/**
 * Base Repository Pattern Implementation
 * Provides common database operations and abstracts Prisma interactions
 */
class BaseRepository {
  constructor(prisma, modelName) {
    this.prisma = prisma;
    this.model = prisma[modelName];
    this.modelName = modelName;
  }

  /**
   * Find a single record by ID
   */
  async findById(id, options = {}) {
    try {
      return await this.model.findUnique({
        where: { id },
        ...options
      });
    } catch (error) {
      throw new Error(`Failed to find ${this.modelName} by ID: ${error.message}`);
    }
  }

  /**
   * Find multiple records with filtering and pagination
   */
  async findMany(options = {}) {
    try {
      const { page = 1, limit = 10, where = {}, orderBy = {}, include = {} } = options;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          orderBy,
          include,
          skip,
          take: limit
        }),
        this.model.count({ where })
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to find ${this.modelName} records: ${error.message}`);
    }
  }

  /**
   * Create a new record
   */
  async create(data, options = {}) {
    try {
      return await this.model.create({
        data,
        ...options
      });
    } catch (error) {
      throw new Error(`Failed to create ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Update a record by ID
   */
  async update(id, data, options = {}) {
    try {
      return await this.model.update({
        where: { id },
        data,
        ...options
      });
    } catch (error) {
      throw new Error(`Failed to update ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Delete a record by ID (soft delete if deletedAt field exists)
   */
  async delete(id) {
    try {
      // Check if model supports soft delete
      const modelFields = await this.prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${this.modelName.toLowerCase()}s 
        AND column_name = 'deleted_at'
      `;

      if (modelFields.length > 0) {
        // Soft delete
        return await this.model.update({
          where: { id },
          data: { deletedAt: new Date() }
        });
      } else {
        // Hard delete
        return await this.model.delete({
          where: { id }
        });
      }
    } catch (error) {
      throw new Error(`Failed to delete ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Bulk operations
   */
  async bulkCreate(dataArray, options = {}) {
    try {
      return await this.model.createMany({
        data: dataArray,
        ...options
      });
    } catch (error) {
      throw new Error(`Failed to bulk create ${this.modelName}: ${error.message}`);
    }
  }

  async bulkUpdate(where, data) {
    try {
      return await this.model.updateMany({
        where,
        data
      });
    } catch (error) {
      throw new Error(`Failed to bulk update ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Advanced queries
   */
  async aggregate(options = {}) {
    try {
      return await this.model.aggregate(options);
    } catch (error) {
      throw new Error(`Failed to aggregate ${this.modelName}: ${error.message}`);
    }
  }

  async groupBy(options = {}) {
    try {
      return await this.model.groupBy(options);
    } catch (error) {
      throw new Error(`Failed to group ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Transaction support
   */
  async transaction(operations) {
    try {
      return await this.prisma.$transaction(operations);
    } catch (error) {
      throw new Error(`Transaction failed for ${this.modelName}: ${error.message}`);
    }
  }

  /**
   * Raw query execution
   */
  async executeRaw(query, params = []) {
    try {
      return await this.prisma.$executeRaw(query, ...params);
    } catch (error) {
      throw new Error(`Raw query execution failed: ${error.message}`);
    }
  }

  async queryRaw(query, params = []) {
    try {
      return await this.prisma.$queryRaw(query, ...params);
    } catch (error) {
      throw new Error(`Raw query failed: ${error.message}`);
    }
  }
}

module.exports = BaseRepository;