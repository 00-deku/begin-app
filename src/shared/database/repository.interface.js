/**
 * Standard repository interface.
 *
 * Every concrete repository must implement these methods.
 * This file contains only JSDoc-documented async stubs; it carries
 * no logic and is never called at runtime - it exists solely as a
 * shared contract for all repository implementations across modules.
 */

/**
 * Find a single record by its primary identifier.
 *
 * @param {string} id - The record's unique identifier.
 * @returns {Promise<object|null>} The matching plain object, or null if not found.
 */
export async function findById(id) {}

/**
 * Find the first record that matches the given filter.
 *
 * @param {object} filter - Key/value pairs used to match the record.
 * @returns {Promise<object|null>} The matching plain object, or null if not found.
 */
export async function findOne(filter) {}

/**
 * Find all records that match the given filter.
 *
 * @param {object} filter - Key/value pairs used to match records.
 * @param {object} [options] - Optional query modifiers (sort, limit, skip, projection).
 * @returns {Promise<object[]>} Array of matching plain objects (may be empty).
 */
export async function findMany(filter, options) {}

/**
 * Insert a new record.
 *
 * @param {object} data - Field values for the new record.
 * @returns {Promise<object>} The created plain object.
 */
export async function create(data) {}

/**
 * Update a single record identified by its primary key.
 *
 * @param {string} id - The record's unique identifier.
 * @param {object} data - Partial field values to apply.
 * @returns {Promise<object|null>} The updated plain object, or null if not found.
 */
export async function updateById(id, data) {}

/**
 * Update the first record that matches the given filter.
 *
 * @param {object} filter - Key/value pairs used to locate the record.
 * @param {object} data - Partial field values to apply.
 * @returns {Promise<object|null>} The updated plain object, or null if not found.
 */
export async function updateOne(filter, data) {}

/**
 * Delete a single record identified by its primary key.
 *
 * @param {string} id - The record's unique identifier.
 * @returns {Promise<boolean>} True if a record was deleted, false otherwise.
 */
export async function deleteById(id) {}

/**
 * Delete the first record that matches the given filter.
 *
 * @param {object} filter - Key/value pairs used to locate the record.
 * @returns {Promise<boolean>} True if a record was deleted, false otherwise.
 */
export async function deleteOne(filter) {}

/**
 * Delete all records that match the given filter.
 *
 * @param {object} filter - Key/value pairs used to match records.
 * @returns {Promise<number>} The number of records deleted.
 */
export async function deleteMany(filter) {}

/**
 * Count records that match the given filter.
 *
 * @param {object} filter - Key/value pairs used to match records.
 * @returns {Promise<number>} The count of matching records.
 */
export async function count(filter) {}
